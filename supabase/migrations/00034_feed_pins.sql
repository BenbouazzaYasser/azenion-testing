-- Migration: 00034_feed_pins
--
-- Redesigns feed pinning from a single global posts.is_pinned boolean into a
-- per-feed architecture. Pinning becomes a property of a FEED, not a post:
-- the same post can be pinned independently in the global feed, its branch
-- feed, and (future) its team / project feeds.
--
--   1. New `feed_pins` table keyed by (post_id, scope, feed owner).
--   2. `toggle_feed_pin` RPC - the single, server-enforced gatekeeper for
--      pin/unpin, with per-scope permissions:
--        global  -> platform admin only
--        branch  -> branch leaders + platform admin
--        team    -> team owner + platform admin      (future)
--        project -> project owner + platform admin   (future)
--   3. `get_global_feed_posts` / `get_branch_feed_posts` RPCs return posts
--      ordered pinned-first per feed scope.
--   4. Backfills existing pins into `feed_pins` (branch scope), then drops the
--      legacy `posts.is_pinned` and `branch_announcements.is_pinned` columns.
--      Source-edit triggers no longer touch pin state at all, so edits can
--      never silently clear a pin.

-- ── 1. feed_pins ───────────────────────────────────────────────────────────

create table if not exists public.feed_pins (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  scope text not null check (scope in ('global', 'branch', 'team', 'project')),
  branch_id uuid references public.branches(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  feed_key text generated always as (
    case
      when scope = 'global'  then 'global'
      when scope = 'branch'  then 'branch:'  || branch_id::text
      when scope = 'team'    then 'team:'    || team_id::text
      when scope = 'project' then 'project:' || project_id::text
    end
  ) stored,
  check (
    (scope = 'global'  and branch_id is null  and team_id is null  and project_id is null)
    or (scope = 'branch'  and branch_id is not null and team_id is null  and project_id is null)
    or (scope = 'team'    and branch_id is null  and team_id is not null and project_id is null)
    or (scope = 'project' and branch_id is null  and team_id is null  and project_id is not null)
  ),
  unique (post_id, scope, feed_key)
);

alter table public.feed_pins enable row level security;

create index if not exists idx_feed_pins_global
  on public.feed_pins (post_id) where scope = 'global';
create index if not exists idx_feed_pins_branch
  on public.feed_pins (branch_id, post_id) where scope = 'branch';
create index if not exists idx_feed_pins_team
  on public.feed_pins (team_id, post_id) where scope = 'team';
create index if not exists idx_feed_pins_project
  on public.feed_pins (project_id, post_id) where scope = 'project';

comment on table public.feed_pins is
  'Per-feed pins. scope selects the feed (global/branch/team/project) and the
   matching owner column identifies the specific feed. Pinning is managed
   exclusively through public.toggle_feed_pin, which enforces permissions.';

-- RLS: reads are open; writes go through the RPC (service_role only) so
-- authorization stays in one place and cannot be bypassed via direct REST.
create policy "anyone can read feed pins"
  on public.feed_pins for select
  using (true);

create policy "feed pins are managed via RPC"
  on public.feed_pins for insert
  with check (auth.role() = 'service_role');

create policy "feed pins are managed via RPC (update)"
  on public.feed_pins for update
  using (auth.role() = 'service_role');

create policy "feed pins are managed via RPC (delete)"
  on public.feed_pins for delete
  using (auth.role() = 'service_role');

grant select on public.feed_pins to anon, authenticated, service_role;
grant insert, update, delete on public.feed_pins to service_role;

-- ── 2. toggle_feed_pin: single server-enforced pin gatekeeper ─────────────

create or replace function public.toggle_feed_pin(
  p_post_id uuid,
  p_scope text,
  p_branch_id uuid default null,
  p_team_id uuid default null,
  p_project_id uuid default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_post_id uuid;
  v_source_type text;
  v_source_id uuid;
  v_feed_owner uuid;
begin
  select id, source_type, source_id into v_post_id, v_source_type, v_source_id
  from public.posts
  where id = p_post_id;

  if v_post_id is null then
    raise exception 'Post not found';
  end if;

  if p_scope = 'global' then
    if not public.is_platform_admin() then
      raise exception 'Only the platform administrator can pin to the global feed';
    end if;
    v_feed_owner := null;

  elsif p_scope = 'branch' then
    if v_source_type in ('branch_announcement', 'branch_highlight', 'branch_event') then
      if v_source_type = 'branch_announcement' then
        select branch_id into v_feed_owner from public.branch_announcements where id = v_source_id;
      elsif v_source_type = 'branch_highlight' then
        select branch_id into v_feed_owner from public.branch_highlights where id = v_source_id;
      else
        select branch_id into v_feed_owner from public.branch_events where id = v_source_id;
      end if;
    elsif v_source_type = 'team_update' then
      select t.branch_id into v_feed_owner
      from public.team_updates tu
      join public.teams t on t.id = tu.team_id
      where tu.id = v_source_id;
    elsif v_source_type = 'project_update' then
      select t.branch_id into v_feed_owner
      from public.project_updates pu
      join public.projects pr on pr.id = pu.project_id
      left join public.teams t on t.id = pr.team_id
      where pu.id = v_source_id;
    end if;

    if v_feed_owner is null then
      raise exception 'Post is not linked to a branch';
    end if;
    if p_branch_id is not null and p_branch_id <> v_feed_owner then
      raise exception 'Post does not belong to this branch';
    end if;
    if not public.is_branch_leader(v_feed_owner) and not public.is_platform_admin() then
      raise exception 'Only branch leaders can pin in this branch';
    end if;

  elsif p_scope = 'team' then
    if v_source_type = 'team_update' then
      select team_id into v_feed_owner from public.team_updates where id = v_source_id;
    elsif v_source_type = 'project_update' then
      select pr.team_id into v_feed_owner
      from public.project_updates pu
      join public.projects pr on pr.id = pu.project_id
      where pu.id = v_source_id;
    end if;

    if v_feed_owner is null then
      raise exception 'Post is not linked to a team';
    end if;
    if p_team_id is not null and p_team_id <> v_feed_owner then
      raise exception 'Post does not belong to this team';
    end if;
    if not public.is_platform_admin()
      and not exists (select 1 from public.teams where id = v_feed_owner and owner_id = auth.uid()) then
      raise exception 'Only team owners can pin in this team';
    end if;

  elsif p_scope = 'project' then
    if v_source_type = 'project_update' then
      select project_id into v_feed_owner from public.project_updates where id = v_source_id;
    end if;

    if v_feed_owner is null then
      raise exception 'Post is not linked to a project';
    end if;
    if p_project_id is not null and p_project_id <> v_feed_owner then
      raise exception 'Post does not belong to this project';
    end if;
    if not public.is_platform_admin()
      and not exists (select 1 from public.projects where id = v_feed_owner and owner_id = auth.uid()) then
      raise exception 'Only project owners can pin in this project';
    end if;

  else
    raise exception 'Invalid pin scope';
  end if;

  if exists (
    select 1 from public.feed_pins
    where post_id = v_post_id
      and scope = p_scope
      and (p_scope = 'global'
           or (p_scope = 'branch'  and branch_id  = v_feed_owner)
           or (p_scope = 'team'    and team_id    = v_feed_owner)
           or (p_scope = 'project' and project_id = v_feed_owner))
  ) then
    delete from public.feed_pins
    where post_id = v_post_id
      and scope = p_scope
      and (p_scope = 'global'
           or (p_scope = 'branch'  and branch_id  = v_feed_owner)
           or (p_scope = 'team'    and team_id    = v_feed_owner)
           or (p_scope = 'project' and project_id = v_feed_owner));
  else
    insert into public.feed_pins (post_id, scope, branch_id, team_id, project_id, created_by)
    values (
      v_post_id,
      p_scope,
      case when p_scope = 'branch'  then v_feed_owner else null end,
      case when p_scope = 'team'    then v_feed_owner else null end,
      case when p_scope = 'project' then v_feed_owner else null end,
      auth.uid()
    );
  end if;
end;
$$;

grant execute on function public.toggle_feed_pin(uuid, text, uuid, uuid, uuid)
  to anon, authenticated, service_role;

-- ── 3. Feed-ordering RPCs (pinned first, per feed scope) ──────────────────

create or replace function public.get_global_feed_posts(
  p_filter text default null,
  p_page int default 1,
  p_page_size int default 20
)
returns setof public.posts
language sql
security definer set search_path = public
stable
as $$
  select p.*
  from public.posts p
  where p_filter is null or p_filter = 'all' or p.source_type = p_filter
  order by
    (exists (
      select 1 from public.feed_pins fp
      where fp.post_id = p.id and fp.scope = 'global'
    )) desc,
    p.created_at desc
  limit p_page_size
  offset (p_page - 1) * p_page_size;
$$;

create or replace function public.get_branch_feed_posts(
  p_branch_id uuid,
  p_source_ids uuid[],
  p_page int default 1,
  p_page_size int default 20
)
returns setof public.posts
language sql
security definer set search_path = public
stable
as $$
  select p.*
  from public.posts p
  where p.source_id = any(p_source_ids)
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

grant execute on function public.get_global_feed_posts(text, int, int)
  to anon, authenticated, service_role;
grant execute on function public.get_branch_feed_posts(uuid, uuid[], int, int)
  to anon, authenticated, service_role;

-- ── 4. Backfill existing pins into feed_pins (branch scope) ───────────────

insert into public.feed_pins (post_id, scope, branch_id, created_by)
select p.id, 'branch', b.branch_id, p.author_id
from public.posts p
join (
  select 'branch_announcement' as source_type, id as source_id, branch_id
  from public.branch_announcements
  union all
  select 'team_update', tu.id, t.branch_id
  from public.team_updates tu
  join public.teams t on t.id = tu.team_id
  where t.branch_id is not null
  union all
  select 'project_update', pu.id, t.branch_id
  from public.project_updates pu
  join public.projects pr on pr.id = pu.project_id
  left join public.teams t on t.id = pr.team_id
  where t.branch_id is not null
) b
  on b.source_type = p.source_type
 and b.source_id = p.source_id
where p.is_pinned
  and b.branch_id is not null
  and not exists (
    select 1 from public.feed_pins fp
    where fp.post_id = p.id and fp.scope = 'branch' and fp.branch_id = b.branch_id
  );

-- ── 5. sync_feed_post no longer owns pin state ────────────────────────────

create or replace function public.sync_feed_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_type text;
  v_title text;
  v_body text;
  v_images jsonb;
  v_author_id uuid;
  v_created_at timestamptz;
  v_updated_at timestamptz;
  v_row jsonb;
begin
  v_row := to_jsonb(NEW);
  v_created_at := (v_row->>'created_at')::timestamptz;

  case TG_TABLE_NAME
    when 'project_updates' then
      v_source_type := 'project_update';
      v_title := NEW.title;
      v_body := NEW.body;
      v_author_id := NEW.author_id;
      v_images := coalesce(NEW.images,
        case when NEW.image_url is not null then jsonb_build_array(NEW.image_url) else '[]'::jsonb end);
    when 'team_updates' then
      v_source_type := 'team_update';
      v_title := NEW.title;
      v_body := NEW.body;
      v_author_id := NEW.author_id;
      v_images := coalesce(NEW.images,
        case when NEW.image_url is not null then jsonb_build_array(NEW.image_url) else '[]'::jsonb end);
    when 'branch_announcements' then
      v_source_type := 'branch_announcement';
      v_title := NEW.title;
      v_body := NEW.body;
      v_author_id := NEW.author_id;
      v_images := coalesce(NEW.images,
        case when NEW.image_url is not null then jsonb_build_array(NEW.image_url) else '[]'::jsonb end);
    when 'branch_highlights' then
      v_source_type := 'branch_highlight';
      v_title := NEW.title;
      v_body := NEW.description;
      v_author_id := null;
      v_images := case when NEW.image_url is not null then jsonb_build_array(NEW.image_url) else '[]'::jsonb end;
    when 'branch_events' then
      v_source_type := 'branch_event';
      v_title := NEW.title;
      v_body := NEW.description;
      v_author_id := null;
      v_images := case when NEW.cover_url is not null then jsonb_build_array(NEW.cover_url) else '[]'::jsonb end;
    else
      v_source_type := TG_TABLE_NAME;
      v_title := v_row->>'title';
      v_body := v_row->>'body';
      v_images := coalesce(v_row->'images', '[]'::jsonb);
  end case;

  if TG_OP = 'DELETE' then
    delete from public.posts
    where source_type = v_source_type and source_id = OLD.id;
    return OLD;
  end if;

  if v_row ? 'updated_at' and (v_row->>'updated_at') is not null then
    v_updated_at := (v_row->>'updated_at')::timestamptz;
  else
    v_updated_at := v_created_at;
  end if;

  insert into public.posts (author_id, title, body, images, source_type, source_id, created_at, updated_at)
  values (v_author_id, v_title, v_body, v_images, v_source_type, NEW.id, v_created_at, v_updated_at)
  on conflict (source_type, source_id) do update set
    title      = excluded.title,
    body       = excluded.body,
    images     = excluded.images,
    updated_at = excluded.updated_at;

  return NEW;
end;
$$;

-- ── 6. Branch announcement RPCs manage pins via feed_pins ────────────────

create or replace function public.create_branch_announcement(
  p_branch_id uuid,
  p_title text,
  p_body text default null,
  p_image_url text default null,
  p_is_pinned boolean default false
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_announcement_id uuid;
  v_branch_name text;
begin
  if not public.is_branch_leader(p_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch leaders can publish announcements';
  end if;

  select name into v_branch_name
  from public.branches
  where id = p_branch_id;

  if v_branch_name is null then
    raise exception 'Branch not found';
  end if;

  insert into public.branch_announcements (branch_id, author_id, title, body, image_url)
  values (p_branch_id, auth.uid(), p_title, p_body, p_image_url)
  returning id into v_announcement_id;

  if p_is_pinned then
    insert into public.feed_pins (post_id, scope, branch_id, created_by)
    select p.id, 'branch', p_branch_id, auth.uid()
    from public.posts p
    where p.source_type = 'branch_announcement' and p.source_id = v_announcement_id;
  end if;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'created_branch_announcement',
    jsonb_build_object(
      'branch_id', p_branch_id,
      'branch_name', v_branch_name,
      'announcement_id', v_announcement_id
    )
  );

  return v_announcement_id;
end;
$$;

create or replace function public.update_branch_announcement(
  p_announcement_id uuid,
  p_title text default null,
  p_body text default null,
  p_image_url text default null,
  p_is_pinned boolean default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_branch_id uuid;
  v_post_id uuid;
begin
  select branch_id into v_branch_id
  from public.branch_announcements
  where id = p_announcement_id;

  if v_branch_id is null then
    raise exception 'Announcement not found';
  end if;

  if not public.is_branch_leader(v_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch leaders can edit announcements';
  end if;

  update public.branch_announcements set
    title      = coalesce(p_title, title),
    body       = coalesce(p_body, body),
    image_url  = coalesce(p_image_url, image_url),
    updated_at = now()
  where id = p_announcement_id;

  if p_is_pinned is not null then
    select id into v_post_id
    from public.posts
    where source_type = 'branch_announcement' and source_id = p_announcement_id;

    if p_is_pinned then
      insert into public.feed_pins (post_id, scope, branch_id, created_by)
      values (v_post_id, 'branch', v_branch_id, auth.uid())
      on conflict (post_id, scope, feed_key) do nothing;
    else
      delete from public.feed_pins
      where post_id = v_post_id and scope = 'branch' and branch_id = v_branch_id;
    end if;
  end if;
end;
$$;

grant execute on function public.create_branch_announcement(uuid, text, text, text, boolean)
  to anon, authenticated, service_role;
grant execute on function public.update_branch_announcement(uuid, text, text, text, boolean)
  to anon, authenticated, service_role;

-- ── 7. Drop legacy pin columns ────────────────────────────────────────────

alter table public.posts drop column if exists is_pinned;
alter table public.branch_announcements drop column if exists is_pinned;
