-- Migration: 00054_trending_ranking
--
-- Implements the ranking system that powers the Community page's dynamic
-- sections (Trending Feed, Trending Teams, Featured Projects).
--
--   1. `post_views` — lightweight, anti-inflation view counter for feed posts.
--   2. `record_post_view` — the single RPC that records a view (dedup per
--      browser session so rapid refreshes are not counted).
--   3. `get_trending_feed`    — highest-scoring posts over the sliding window.
--   4. `get_trending_teams`   — teams ranked by momentum in the window.
--   5. `get_featured_projects`— projects ranked by momentum in the window.
--
-- Ranking weights (last 7 days) are centralised in `trending_weights` so they
-- can be tuned in one place without touching the queries:
--
--   Trending Feed (score = w1*views + w2*likes + w3*comments)
--     40% views, 35% likes, 25% comments + replies
--
--   Trending Teams (score = w1*posts + w2*likes + w3*new members)
--     40% posts/updates, 40% likes on those posts, 20% new members
--
--   Featured Projects (score = w1*likes + w2*updates + w3*reactions)
--     40% likes on updates, 40% update count, 20% reactions (comments)
--     NOTE: contributor tracking does not exist, so the 20% weight uses
--     comments/reactions on updates as the engagement proxy.

-- ── 1. Centralised, tunable weights ───────────────────────────────────────

create or replace function public.trending_weights()
returns jsonb
language sql
immutable
as $$
  select '{
    "feed_views":    0.40,
    "feed_likes":    0.35,
    "feed_comments": 0.25,
    "team_posts":    0.40,
    "team_likes":    0.40,
    "team_members":  0.20,
    "project_likes": 0.40,
    "project_updates":0.40,
    "project_reactions":0.20
  }'::jsonb
$$;

-- ── 2. View counter (post_views) ──────────────────────────────────────────

create table if not exists public.post_views (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete set null,
  session_token text,
  visited_at timestamptz not null default now()
);

alter table public.post_views enable row level security;

-- A view is recorded once per (post, browser session). This is the backbone
-- of anti-inflation: refreshing a post, or re-opening it from the same session
-- tab, will hit the unique constraint and be ignored instead of inflating the
-- counter. Logged-in users additionally keep `viewer_id` for attribution.
create unique index if not exists idx_post_views_dedup_session
  on public.post_views (post_id, session_token)
  where session_token is not null;
create unique index if not exists idx_post_views_dedup_user
  on public.post_views (post_id, viewer_id)
  where session_token is null and viewer_id is not null;

create index if not exists idx_post_views_post
  on public.post_views (post_id, visited_at);

comment on table public.post_views is
  'Feed-post view counter. Each (post, session) may contribute at most one
   view, so rapid refreshes from the same session are not counted.';

-- Views are written only through the record_post_view RPC (SECURITY DEFINER).
-- The table is not exposed directly to anon/authenticated roles (no grants to
-- them). The service_role can read/write it and also bypasses RLS, so this
-- policy is defensive rather than the access control path.
drop policy if exists "post views handled by service role" on public.post_views;
create policy "post views handled by service role"
  on public.post_views for all
  to service_role
  using (true)
  with check (true);

grant select, insert, update, delete on public.post_views to service_role;

-- ── 3. record_post_view ──────────────────────────────────────────────────

create or replace function public.record_post_view(
  p_post_id uuid,
  p_viewer_id uuid default null,
  p_session_token text default null
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.post_views (post_id, viewer_id, session_token)
  values (p_post_id, p_viewer_id, p_session_token)
  on conflict do nothing;
  return found;
end;
$$;

grant execute on function public.record_post_view(uuid, uuid, text)
  to authenticated, service_role;

-- ── 4. Trending Feed ─────────────────────────────────────────────────────

create or replace function public.get_trending_feed(
  p_window_days int default 7,
  p_limit int default 12
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
  order by (coalesce(v.cnt, 0) * v_views_w
           + coalesce(lk.cnt, 0) * v_likes_w
           + coalesce(cm.cnt, 0) * v_comments_w) desc,
           p.created_at desc
  limit p_limit;
end;
$$;

grant execute on function public.get_trending_feed(int, int)
  to authenticated, service_role;

-- ── 5. Trending Teams ───────────────────────────────────────────────────

create or replace function public.get_trending_teams(
  p_window_days int default 7,
  p_limit int default 12
)
returns table (
  id uuid,
  score numeric,
  posts_count bigint,
  likes_count bigint,
  members_count bigint
)
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_ws timestamptz := now() - make_interval(days => p_window_days);
  v_posts_w numeric   := (public.trending_weights()->>'team_posts')::numeric;
  v_likes_w numeric   := (public.trending_weights()->>'team_likes')::numeric;
  v_members_w numeric := (public.trending_weights()->>'team_members')::numeric;
begin
  return query
  with u as (
    select tu.id as update_id, tu.team_id as team_id
    from public.team_updates tu
    join public.posts p on p.source_type = 'team_update' and p.source_id = tu.id
    where p.created_at >= v_ws
  ),
  lk as (
    select l.target_id as update_id, count(*) as cnt
    from public.update_likes l
    where l.target_type = 'team_update'
      and l.target_id in (select update_id from u)
      and l.created_at >= v_ws
    group by l.target_id
  ),
  stats as (
    select u.team_id,
           count(*) as posts_count,
           coalesce(count(lk.update_id), 0) as likes_count
    from u
    left join lk on lk.update_id = u.update_id
    group by u.team_id
  ),
  m as (
    select team_id, count(*) as members_count
    from public.team_members
    where joined_at >= v_ws
    group by team_id
  )
  select t.id,
         (coalesce(s.posts_count, 0) * v_posts_w
          + coalesce(s.likes_count, 0) * v_likes_w
          + coalesce(m.members_count, 0) * v_members_w) as score,
         coalesce(s.posts_count, 0),
         coalesce(s.likes_count, 0),
         coalesce(m.members_count, 0)
  from public.teams t
  left join stats s on s.team_id = t.id
  left join m on m.team_id = t.id
  where t.visibility = 'public'
    and (coalesce(s.posts_count, 0) + coalesce(s.likes_count, 0) + coalesce(m.members_count, 0)) > 0
  order by (coalesce(s.posts_count, 0) * v_posts_w
           + coalesce(s.likes_count, 0) * v_likes_w
           + coalesce(m.members_count, 0) * v_members_w) desc
  limit p_limit;
end;
$$;

grant execute on function public.get_trending_teams(int, int)
  to authenticated, service_role;

-- ── 6. Featured Projects ────────────────────────────────────────────────

create or replace function public.get_featured_projects(
  p_window_days int default 7,
  p_limit int default 12
)
returns table (
  id uuid,
  score numeric,
  likes_count bigint,
  updates_count bigint,
  reactions_count bigint
)
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_ws timestamptz := now() - make_interval(days => p_window_days);
  v_likes_w numeric  := (public.trending_weights()->>'project_likes')::numeric;
  v_updates_w numeric := (public.trending_weights()->>'project_updates')::numeric;
  v_reactions_w numeric := (public.trending_weights()->>'project_reactions')::numeric;
begin
  return query
  with u as (
    select pu.id as update_id, pu.project_id as project_id
    from public.project_updates pu
    join public.posts p on p.source_type = 'project_update' and p.source_id = pu.id
    where p.created_at >= v_ws
  ),
  lk as (
    select l.target_id as update_id, count(*) as cnt
    from public.update_likes l
    where l.target_type = 'project_update'
      and l.target_id in (select update_id from u)
      and l.created_at >= v_ws
    group by l.target_id
  ),
  cm as (
    select c.target_id as update_id, count(*) as cnt
    from public.update_comments c
    where c.target_type = 'project_update'
      and c.target_id in (select update_id from u)
      and c.created_at >= v_ws
    group by c.target_id
  ),
  stats as (
    select u.project_id,
           count(*) as updates_count,
           coalesce(count(lk.update_id), 0) as likes_count,
           coalesce(count(cm.update_id), 0) as reactions_count
    from u
    left join lk on lk.update_id = u.update_id
    left join cm on cm.update_id = u.update_id
    group by u.project_id
  )
  select
    s.project_id as id,
    (s.likes_count * v_likes_w
     + s.updates_count * v_updates_w
     + s.reactions_count * v_reactions_w) as score,
    s.likes_count,
    s.updates_count,
    s.reactions_count
  from stats s
  join public.projects pr on pr.id = s.project_id
  where pr.lifecycle_status is distinct from 'ARCHIVED'
  order by (s.likes_count * v_likes_w
           + s.updates_count * v_updates_w
           + s.reactions_count * v_reactions_w) desc,
           pr.created_at desc
  limit p_limit;
end;
$$;

grant execute on function public.get_featured_projects(int, int)
  to authenticated, service_role;