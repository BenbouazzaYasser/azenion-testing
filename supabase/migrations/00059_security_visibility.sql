-- Migration: 00059_security_visibility
--
-- Confirmed findings from the pre-launch security audit (C1, C2, C4, C5,
-- H1, H2, H3, H4). This migration closes the following without changing UX:
--
--   C2/H4 : `posts` is world-readable (`using (true)`) and the feed RPCs
--           (`get_global_feed_posts`, `get_branch_feed_posts`,
--           `get_trending_feed`) return EVERY post regardless of the source
--           entity's visibility, leaking private team/project updates.
--           -> Enforce per-viewer visibility in RLS + feed RPCs.
--   C4    : `get_user_teams(p_user_id)` lets anon/authenticated enumerate any
--           user's team memberships. -> Pin to the current user (or service).
--   C5    : `feed_items` VIEW is owned by the migration role, bypasses RLS,
--           and exposes ALL users' `activities` + updates to anonymous read.
--           -> Revoke read from anon/authenticated (app does not use it).
--   H1    : `join_team` / `join_project` let users join private resources.
--           -> Refuse to join non-open resources.
--   H2    : Direct `INSERT into teams` bypasses create_team ownership rules.
--           -> Remove the direct INSERT grant + policy on teams.
--   H3    : `update_likes` / `update_comments` readable by every
--           authenticated user even when the payload is private.
--           -> Scope SELECT by target visibility.

-- ── 1. Visibility helper ─────────────────────────────────────────────────
-- Computes whether a given feed post (by source_type/source_id) is visible
-- to `p_user_id`. SECURITY DEFINER so it can read membership rows regardless
-- of caller role. If `p_user_id` is NULL (e.g. anonymous) only public/open
-- sources are visible.

create or replace function public.is_feed_post_visible(
  p_source_type text,
  p_source_id uuid,
  p_user_id uuid default null
)
returns boolean
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_uid uuid := coalesce(p_user_id, auth.uid());
begin
  if p_source_type = 'team_update' then
    return exists (
      select 1
      from public.team_updates tu
      join public.teams t on t.id = tu.team_id
      where tu.id = p_source_id
        and (
          t.visibility = 'public'
          or exists (
            select 1 from public.team_members tm
            where tm.team_id = t.id and tm.user_id = v_uid
          )
        )
    );
  elsif p_source_type = 'project_update' then
    return exists (
      select 1
      from public.project_updates pu
      join public.projects p on p.id = pu.project_id
      where pu.id = p_source_id
        and (
          p.visibility in ('public', 'open')
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = v_uid
          )
        )
    );
  else
    -- branch_announcements, branch_highlights, branch_events, user_post, etc.
    return true;
  end if;
end;
$$;

-- ── 2. Feed RPCs: scope by viewer ────────────────────────────────────────

-- get_global_feed_posts
drop function if exists public.get_global_feed_posts(text, int, int);
create or replace function public.get_global_feed_posts(
  p_filter text default null,
  p_page int default 1,
  p_page_size int default 20,
  p_viewer uuid default null
)
returns setof public.posts
language sql
security definer set search_path = public
stable
as $$
  select p.*
  from public.posts p
  where (p_filter is null or p_filter = 'all' or p.source_type = p_filter)
    and public.is_feed_post_visible(p.source_type, p.source_id, p_viewer)
  order by
    (exists (
      select 1 from public.feed_pins fp
      where fp.post_id = p.id and fp.scope = 'global'
    )) desc,
    p.created_at desc
  limit p_page_size
  offset (p_page - 1) * p_page_size;
$$;
grant execute on function public.get_global_feed_posts(text, int, int, uuid)
  to anon, authenticated, service_role;

-- get_branch_feed_posts
drop function if exists public.get_branch_feed_posts(uuid, uuid[], int, int);
create or replace function public.get_branch_feed_posts(
  p_branch_id uuid,
  p_source_ids uuid[],
  p_page int default 1,
  p_page_size int default 20,
  p_viewer uuid default null
)
returns setof public.posts
language sql
security definer set search_path = public
stable
as $$
  select p.*
  from public.posts p
  where p.source_id = any(p_source_ids)
    and public.is_feed_post_visible(p.source_type, p.source_id, p_viewer)
  order by
    (exists (
      select 1 from public.feed_pins fp
      where fp.post_id = p.id
        and fp.scope = 'branch'
        and fp.branch_id = p_branch_id
    )) desc,
    p.created_at desc
  limit p_page_size
  offset (p_page - 1) * p_page_size;
$$;
grant execute on function public.get_branch_feed_posts(uuid, uuid[], int, int, uuid)
  to anon, authenticated, service_role;

-- get_trending_feed
drop function if exists public.get_trending_feed(int, int);
create or replace function public.get_trending_feed(
  p_window_days int default 7,
  p_limit int default 12,
  p_viewer uuid default null
)
returns table (
  id uuid,
  author_id uuid,
  title text,
  body text,
  images jsonb,
  source_type text,
  source_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  score numeric
)
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_ws timestamptz := now() - make_interval(days => p_window_days);
  v_views_w   numeric := (public.trending_weights()->>'feed_views')::numeric;
  v_likes_w   numeric := (public.trending_weights()->>'feed_likes')::numeric;
  v_comments_w numeric := (public.trending_weights()->>'feed_comments')::numeric;
begin
  return query
  with v as (
    select post_id as id, count(*) as cnt
    from public.post_views
    where visited_at >= v_ws
    group by post_id
  ),
  lk as (
    select ul.target_type, ul.target_id, count(*) as cnt
    from public.update_likes ul
    where ul.created_at >= v_ws
    group by ul.target_type, ul.target_id
  ),
  cm as (
    select uc.target_type, uc.target_id, count(*) as cnt
    from public.update_comments uc
    where uc.created_at >= v_ws
    group by uc.target_type, uc.target_id
  )
  select
    p.id, p.author_id, p.title, p.body, p.images,
    p.source_type, p.source_id, p.created_at, p.updated_at,
    (coalesce(v.cnt, 0) * v_views_w
     + coalesce(lk.cnt, 0) * v_likes_w
     + coalesce(cm.cnt, 0) * v_comments_w) as score
  from public.posts p
  left join v on v.id = p.id
  left join lk on lk.target_type = p.source_type and lk.target_id = p.source_id
  left join cm on cm.target_type = p.source_type and cm.target_id = p.source_id
  where coalesce(v.cnt, 0) + coalesce(lk.cnt, 0) + coalesce(cm.cnt, 0) > 0
    and public.is_feed_post_visible(p.source_type, p.source_id, p_viewer)
  order by (coalesce(v.cnt, 0) * v_views_w
           + coalesce(lk.cnt, 0) * v_likes_w
           + coalesce(cm.cnt, 0) * v_comments_w) desc,
           p.created_at desc
  limit p_limit;
end;
$$;
grant execute on function public.get_trending_feed(int, int, uuid)
  to authenticated, service_role;

-- ── 3. C2: posts SELECT policy scoped by visibility ──────────────────────
-- The app renders feeds through the service role / feed RPCs (RLS-bypassed),
-- so restricting the direct SELECT policy only affects RLS-executed reads
-- (anon + per-user client calls such as search & pin selection), and those
-- are exactly the paths that must be scoped.

drop policy if exists "anyone can read posts" on public.posts;
create policy "posts visible by scope"
  on public.posts for select
  using (public.is_feed_post_visible(source_type, source_id));

-- ── 4. C4: get_user_teams caller identity ───────────────────────────────
-- Only the current user themselves (or the service/admin role) may read a
-- user's teams. Anonymous / other authenticated users are refused.

create or replace function public.get_user_teams(p_user_id uuid)
returns table (
  team_id uuid,
  role text,
  team_slug text,
  team_name text,
  team_logo_url text
)
language plpgsql
security definer set search_path = public
as $$
begin
  if p_user_id is distinct from auth.uid()
     and coalesce(auth.role(), '') not in ('service_role', 'supabase_admin', 'authenticated_user')
  then
    raise exception 'Not authorized to view this user''s teams';
  end if;

  return query
  select
    tm.team_id,
    tm.role,
    t.slug,
    t.name,
    t.logo_url
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where tm.user_id = p_user_id
  order by t.name;
end;
$$;

-- ── 5. C5: feed_items view is unused + leaks all activity/updates ───────
revoke all on public.feed_items from anon, authenticated;
revoke all on public.feed_items from public;

-- ── 6. H1: joining private resources ────────────────────────────────────

create or replace function public.join_team(p_team_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_visibility text;
  v_team_name text;
  v_team_slug text;
begin
  if exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
  ) then
    return;
  end if;

  select name, slug, visibility into v_team_name, v_team_slug, v_visibility
  from public.teams
  where id = p_team_id;

  if v_team_name is null then
    raise exception 'Team not found';
  end if;

  if v_visibility is distinct from 'public' then
    raise exception 'Team is private; allowed to join by owner approval only';
  end if;

  insert into public.team_members (team_id, user_id, role)
  values (p_team_id, auth.uid(), 'member');

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'joined_team',
    jsonb_build_object(
      'team_id', p_team_id,
      'team_name', v_team_name,
      'team_slug', v_team_slug
    )
  );
end;
$$;

create or replace function public.join_project(p_project_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_visibility text;
  v_project_name text;
  v_project_slug text;
begin
  if exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = auth.uid()
  ) then
    return;
  end if;

  select name, slug, visibility into v_project_name, v_project_slug, v_visibility
  from public.projects
  where id = p_project_id;

  if v_project_name is null then
    raise exception 'Project not found';
  end if;

  if v_visibility is distinct from 'open' and v_visibility is distinct from 'public' then
    raise exception 'Project is not open for direct joining';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (p_project_id, auth.uid(), 'member');

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'joined_project',
    jsonb_build_object(
      'project_id', p_project_id,
      'project_name', v_project_name,
      'project_slug', v_project_slug
    )
  );
end;
$$;

-- ── 7. H2: teams must be created via create_team RPC (ownership rules) ──

drop policy if exists "authenticated users can create teams" on public.teams;
revoke insert on public.teams from anon, authenticated;

-- ── 8. H3: scope likes/comments reads by target visibility ──────────────

drop policy if exists "anyone can read likes" on public.update_likes;
create policy "likes visible by scope"
  on public.update_likes for select
  using (public.is_feed_post_visible(target_type, target_id));

drop policy if exists "anyone can read comments" on public.update_comments;
create policy "comments visible by scope"
  on public.update_comments for select
  using (public.is_feed_post_visible(target_type, target_id));