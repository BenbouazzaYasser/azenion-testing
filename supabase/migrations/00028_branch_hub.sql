-- Migration: 00028_branch_hub
--
-- Evolves static Branch pages into fully managed community hubs:
--   - platform_admins        : the Platform Admin role (replaces the hardcoded
--                              username check in branch management RPCs)
--   - branch_managers        : per-branch managers assigned by the Platform Admin
--   - branch_announcements   : posts flowing into the global feed (like team updates)
--   - branch_events          : chronological events; past ones move to history in UI
--   - branch_highlights      : pinned highlights rendered near the top of a branch page
--
-- All mutations are gated by SECURITY DEFINER RPCs (00014-style) that check
-- `is_platform_admin()` / `is_branch_manager()`.

-- ── Platform admins ────────────────────────────────────────────────────────

create table if not exists public.platform_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  created_by uuid references public.profiles(id) on delete set null
);

alter table public.platform_admins enable row level security;

create policy "platform admins are publicly readable"
  on public.platform_admins for select using (true);

-- Seed the current platform administrator
insert into public.platform_admins (user_id)
select id from public.profiles where username = 'Ziy8ed'
on conflict (user_id) do nothing;

-- ── RPC: is_platform_admin ──────────────────────────────────────────────────

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  );
$$;

-- ── Branch managers ────────────────────────────────────────────────────────

create table if not exists public.branch_managers (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  unique (branch_id, user_id)
);

alter table public.branch_managers enable row level security;

create policy "branch managers are publicly readable"
  on public.branch_managers for select using (true);

create index if not exists idx_branch_managers_branch_id
  on public.branch_managers(branch_id);
create index if not exists idx_branch_managers_user_id
  on public.branch_managers(user_id);

-- ── RPC: is_branch_manager ─────────────────────────────────────────────────

create or replace function public.is_branch_manager(
  p_branch_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.branch_managers
    where branch_id = p_branch_id and user_id = p_user_id
  );
$$;

-- ── Branch announcements ───────────────────────────────────────────────────

create table if not exists public.branch_announcements (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.branch_announcements enable row level security;

create index if not exists idx_branch_announcements_branch_id
  on public.branch_announcements(branch_id);
create index if not exists idx_branch_announcements_created_at
  on public.branch_announcements(created_at desc);

-- ── Branch events ──────────────────────────────────────────────────────────

create table if not exists public.branch_events (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  cover_url text,
  registration_url text,
  visibility text not null default 'public' check (visibility in ('public', 'members')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.branch_events enable row level security;

create index if not exists idx_branch_events_branch_id
  on public.branch_events(branch_id);
create index if not exists idx_branch_events_starts_at
  on public.branch_events(starts_at);

-- ── Branch highlights ──────────────────────────────────────────────────────

create table if not exists public.branch_highlights (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  link_url text,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

alter table public.branch_highlights enable row level security;

create index if not exists idx_branch_highlights_branch_id
  on public.branch_highlights(branch_id);

-- ── RLS: public reads ──────────────────────────────────────────────────────

create policy "anyone can read branch announcements"
  on public.branch_announcements for select using (true);

create policy "anyone can read branch events"
  on public.branch_events for select using (true);

create policy "anyone can read branch highlights"
  on public.branch_highlights for select using (true);

-- ── RLS: manager writes (defense in depth; RPCs are the primary gate) ─────

create policy "branch managers can create announcements"
  on public.branch_announcements for insert
  with check (
    auth.uid() = author_id
    and public.is_branch_manager(branch_id)
  );

create policy "branch managers can update announcements"
  on public.branch_announcements for update
  using (public.is_branch_manager(branch_id));

create policy "branch managers can delete announcements"
  on public.branch_announcements for delete
  using (public.is_branch_manager(branch_id));

create policy "branch managers can create events"
  on public.branch_events for insert
  with check (public.is_branch_manager(branch_id));

create policy "branch managers can update events"
  on public.branch_events for update
  using (public.is_branch_manager(branch_id));

create policy "branch managers can delete events"
  on public.branch_events for delete
  using (public.is_branch_manager(branch_id));

create policy "branch managers can create highlights"
  on public.branch_highlights for insert
  with check (public.is_branch_manager(branch_id));

create policy "branch managers can update highlights"
  on public.branch_highlights for update
  using (public.is_branch_manager(branch_id));

create policy "branch managers can delete highlights"
  on public.branch_highlights for delete
  using (public.is_branch_manager(branch_id));

-- ── Grants ─────────────────────────────────────────────────────────────────

grant select, insert, update, delete
  on public.platform_admins to anon, authenticated, service_role;
grant select, insert, update, delete
  on public.branch_managers to anon, authenticated, service_role;
grant select, insert, update, delete
  on public.branch_announcements to anon, authenticated, service_role;
grant select, insert, update, delete
  on public.branch_events to anon, authenticated, service_role;
grant select, insert, update, delete
  on public.branch_highlights to anon, authenticated, service_role;

grant execute on function public.is_platform_admin() to anon, authenticated, service_role;
grant execute on function public.is_branch_manager(uuid, uuid) to anon, authenticated, service_role;

-- ── Refresh branch management RPCs to use the Platform Admin role ─────────
-- (replaces the hardcoded username check with a proper permission lookup)

create or replace function public.create_branch(
  p_name text,
  p_slug text,
  p_institution text default null,
  p_city text default null,
  p_description text default null,
  p_logo_url text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform administrator can manage branches';
  end if;

  insert into public.branches (slug, name, full_name, description, city, logo_url)
  values (p_slug, p_name, p_institution, p_description, p_city, p_logo_url)
  returning id into v_branch_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'created_branch',
    jsonb_build_object(
      'branch_id', v_branch_id,
      'branch_name', p_name,
      'branch_slug', p_slug
    )
  );

  return v_branch_id;
end;
$$;

create or replace function public.update_branch(
  p_branch_id uuid,
  p_name text default null,
  p_slug text default null,
  p_institution text default null,
  p_city text default null,
  p_description text default null,
  p_logo_url text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_platform_admin() and not public.is_branch_manager(p_branch_id) then
    raise exception 'Only the platform administrator or a branch manager can update a branch';
  end if;

  update public.branches set
    name        = coalesce(p_name, name),
    slug        = coalesce(p_slug, slug),
    full_name   = coalesce(p_institution, full_name),
    city        = coalesce(p_city, city),
    description = coalesce(p_description, description),
    logo_url    = coalesce(p_logo_url, logo_url)
  where id = p_branch_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'updated_branch',
    jsonb_build_object(
      'branch_id', p_branch_id,
      'branch_name', p_name
    )
  );
end;
$$;

create or replace function public.delete_branch(p_branch_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_member_count int;
  v_branch_name text;
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform administrator can manage branches';
  end if;

  select count(*) into v_member_count
  from public.branch_members
  where branch_id = p_branch_id;

  if v_member_count > 0 then
    raise exception 'This branch still has members';
  end if;

  select name into v_branch_name
  from public.branches
  where id = p_branch_id;

  delete from storage.objects
  where bucket_id = 'branch-assets'
    and name like p_branch_id || '/%';

  delete from public.branches where id = p_branch_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'deleted_branch',
    jsonb_build_object(
      'branch_id', p_branch_id,
      'branch_name', v_branch_name
    )
  );
end;
$$;

-- ── RPC: assign_branch_manager (Platform Admin only) ───────────────────────

create or replace function public.assign_branch_manager(
  p_branch_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_branch_name text;
  v_username text;
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform administrator can assign branch managers';
  end if;

  select name into v_branch_name
  from public.branches
  where id = p_branch_id;

  if v_branch_name is null then
    raise exception 'Branch not found';
  end if;

  select username into v_username
  from public.profiles
  where id = p_user_id;

  if v_username is null then
    raise exception 'User not found';
  end if;

  insert into public.branch_managers (branch_id, user_id, assigned_by)
  values (p_branch_id, p_user_id, auth.uid())
  on conflict (branch_id, user_id)
  do update set assigned_by = excluded.assigned_by;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'assigned_branch_manager',
    jsonb_build_object(
      'branch_id', p_branch_id,
      'branch_name', v_branch_name,
      'manager_user_id', p_user_id,
      'manager_username', v_username
    )
  );
end;
$$;

-- ── RPC: remove_branch_manager (Platform Admin only) ───────────────────────

create or replace function public.remove_branch_manager(
  p_branch_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_branch_name text;
  v_username text;
  v_manager_count int;
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform administrator can remove branch managers';
  end if;

  select count(*) into v_manager_count
  from public.branch_managers
  where branch_id = p_branch_id;

  if v_manager_count <= 1 then
    raise exception 'A branch must keep at least one manager';
  end if;

  select name into v_branch_name
  from public.branches
  where id = p_branch_id;

  select username into v_username
  from public.profiles
  where id = p_user_id;

  delete from public.branch_managers
  where branch_id = p_branch_id and user_id = p_user_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'removed_branch_manager',
    jsonb_build_object(
      'branch_id', p_branch_id,
      'branch_name', v_branch_name,
      'manager_user_id', p_user_id,
      'manager_username', v_username
    )
  );
end;
$$;

-- ── RPC: create_branch_announcement ────────────────────────────────────────

create or replace function public.create_branch_announcement(
  p_branch_id uuid,
  p_title text,
  p_body text default null,
  p_image_url text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_announcement_id uuid;
  v_branch_name text;
begin
  if not public.is_branch_manager(p_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch managers can publish announcements';
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

-- ── RPC: update_branch_announcement ────────────────────────────────────────

create or replace function public.update_branch_announcement(
  p_announcement_id uuid,
  p_title text default null,
  p_body text default null,
  p_image_url text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  select branch_id into v_branch_id
  from public.branch_announcements
  where id = p_announcement_id;

  if v_branch_id is null then
    raise exception 'Announcement not found';
  end if;

  if not public.is_branch_manager(v_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch managers can edit announcements';
  end if;

  update public.branch_announcements set
    title      = coalesce(p_title, title),
    body       = coalesce(p_body, body),
    image_url  = coalesce(p_image_url, image_url),
    updated_at = now()
  where id = p_announcement_id;
end;
$$;

-- ── RPC: update_branch_announcement_image ──────────────────────────────────

create or replace function public.update_branch_announcement_image(
  p_announcement_id uuid,
  p_image_url text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  select branch_id into v_branch_id
  from public.branch_announcements
  where id = p_announcement_id;

  if v_branch_id is null then
    raise exception 'Announcement not found';
  end if;

  if not public.is_branch_manager(v_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch managers can edit announcements';
  end if;

  update public.branch_announcements set
    image_url  = p_image_url,
    updated_at = now()
  where id = p_announcement_id;
end;
$$;

-- ── RPC: delete_branch_announcement ────────────────────────────────────────

create or replace function public.delete_branch_announcement(
  p_announcement_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  select branch_id into v_branch_id
  from public.branch_announcements
  where id = p_announcement_id;

  if v_branch_id is null then
    raise exception 'Announcement not found';
  end if;

  if not public.is_branch_manager(v_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch managers can delete announcements';
  end if;

  delete from public.branch_announcements where id = p_announcement_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'deleted_branch_announcement',
    jsonb_build_object('announcement_id', p_announcement_id)
  );
end;
$$;

-- ── RPC: create_branch_event ───────────────────────────────────────────────

create or replace function public.create_branch_event(
  p_branch_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_description text default null,
  p_location text default null,
  p_ends_at timestamptz default null,
  p_cover_url text default null,
  p_registration_url text default null,
  p_visibility text default 'public'
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_event_id uuid;
  v_branch_name text;
begin
  if not public.is_branch_manager(p_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch managers can create events';
  end if;

  select name into v_branch_name
  from public.branches
  where id = p_branch_id;

  if v_branch_name is null then
    raise exception 'Branch not found';
  end if;

  insert into public.branch_events (
    branch_id, title, description, location, starts_at, ends_at,
    cover_url, registration_url, visibility
  )
  values (
    p_branch_id, p_title, p_description, p_location, p_starts_at, p_ends_at,
    p_cover_url, p_registration_url, p_visibility
  )
  returning id into v_event_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'created_branch_event',
    jsonb_build_object(
      'branch_id', p_branch_id,
      'branch_name', v_branch_name,
      'event_id', v_event_id,
      'event_title', p_title
    )
  );

  return v_event_id;
end;
$$;

-- ── RPC: update_branch_event ───────────────────────────────────────────────

create or replace function public.update_branch_event(
  p_event_id uuid,
  p_title text default null,
  p_description text default null,
  p_location text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_cover_url text default null,
  p_registration_url text default null,
  p_visibility text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  select branch_id into v_branch_id
  from public.branch_events
  where id = p_event_id;

  if v_branch_id is null then
    raise exception 'Event not found';
  end if;

  if not public.is_branch_manager(v_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch managers can edit events';
  end if;

  update public.branch_events set
    title             = coalesce(p_title, title),
    description       = coalesce(p_description, description),
    location          = coalesce(p_location, location),
    starts_at         = coalesce(p_starts_at, starts_at),
    ends_at           = coalesce(p_ends_at, ends_at),
    cover_url         = coalesce(p_cover_url, cover_url),
    registration_url  = coalesce(p_registration_url, registration_url),
    visibility        = coalesce(p_visibility, visibility),
    updated_at        = now()
  where id = p_event_id;
end;
$$;

-- ── RPC: delete_branch_event ───────────────────────────────────────────────

create or replace function public.delete_branch_event(p_event_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  select branch_id into v_branch_id
  from public.branch_events
  where id = p_event_id;

  if v_branch_id is null then
    raise exception 'Event not found';
  end if;

  if not public.is_branch_manager(v_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch managers can delete events';
  end if;

  delete from public.branch_events where id = p_event_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'deleted_branch_event',
    jsonb_build_object('event_id', p_event_id)
  );
end;
$$;

-- ── RPC: create_branch_highlight ───────────────────────────────────────────

create or replace function public.create_branch_highlight(
  p_branch_id uuid,
  p_title text,
  p_description text default null,
  p_image_url text default null,
  p_link_url text default null,
  p_sort_order int default 0
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_highlight_id uuid;
  v_branch_name text;
begin
  if not public.is_branch_manager(p_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch managers can create highlights';
  end if;

  select name into v_branch_name
  from public.branches
  where id = p_branch_id;

  if v_branch_name is null then
    raise exception 'Branch not found';
  end if;

  insert into public.branch_highlights (
    branch_id, title, description, image_url, link_url, sort_order
  )
  values (p_branch_id, p_title, p_description, p_image_url, p_link_url, p_sort_order)
  returning id into v_highlight_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'created_branch_highlight',
    jsonb_build_object(
      'branch_id', p_branch_id,
      'branch_name', v_branch_name,
      'highlight_id', v_highlight_id,
      'highlight_title', p_title
    )
  );

  return v_highlight_id;
end;
$$;

-- ── RPC: update_branch_highlight ───────────────────────────────────────────

create or replace function public.update_branch_highlight(
  p_highlight_id uuid,
  p_title text default null,
  p_description text default null,
  p_image_url text default null,
  p_link_url text default null,
  p_sort_order int default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  select branch_id into v_branch_id
  from public.branch_highlights
  where id = p_highlight_id;

  if v_branch_id is null then
    raise exception 'Highlight not found';
  end if;

  if not public.is_branch_manager(v_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch managers can edit highlights';
  end if;

  update public.branch_highlights set
    title        = coalesce(p_title, title),
    description  = coalesce(p_description, description),
    image_url    = coalesce(p_image_url, image_url),
    link_url     = coalesce(p_link_url, link_url),
    sort_order   = coalesce(p_sort_order, sort_order)
  where id = p_highlight_id;
end;
$$;

-- ── RPC: delete_branch_highlight ───────────────────────────────────────────

create or replace function public.delete_branch_highlight(p_highlight_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  select branch_id into v_branch_id
  from public.branch_highlights
  where id = p_highlight_id;

  if v_branch_id is null then
    raise exception 'Highlight not found';
  end if;

  if not public.is_branch_manager(v_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch managers can delete highlights';
  end if;

  delete from public.branch_highlights where id = p_highlight_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'deleted_branch_highlight',
    jsonb_build_object('highlight_id', p_highlight_id)
  );
end;
$$;

-- ── Storage: branch-assets bucket ──────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('branch-assets', 'branch-assets', true)
on conflict (id) do nothing;

create policy "branch assets are publicly readable"
  on storage.objects for select using (bucket_id = 'branch-assets');

create policy "branch managers can upload branch assets"
  on storage.objects for insert with check (
    bucket_id = 'branch-assets'
    and (
      public.is_branch_manager((storage.foldername(name))[1]::uuid)
      or public.is_platform_admin()
    )
  );

create policy "branch managers can update branch assets"
  on storage.objects for update using (
    bucket_id = 'branch-assets'
    and (
      public.is_branch_manager((storage.foldername(name))[1]::uuid)
      or public.is_platform_admin()
    )
  );

create policy "branch managers can delete branch assets"
  on storage.objects for delete using (
    bucket_id = 'branch-assets'
    and (
      public.is_branch_manager((storage.foldername(name))[1]::uuid)
      or public.is_platform_admin()
    )
  );

-- ── Feed: expose branch announcements in the unified feed ──────────────────

create or replace view public.feed_items as

-- Project updates
select
  pu.id as id,
  'project_update'::text as source_type,
  pu.id as source_id,
  pu.author_id,
  p.name as group_name,
  pu.project_id as group_id,
  pu.title,
  pu.body,
  pu.image_url,
  pu.created_at
from public.project_updates pu
join public.projects p on p.id = pu.project_id

union all

-- Team updates
select
  tu.id as id,
  'team_update'::text as source_type,
  tu.id as source_id,
  tu.author_id,
  t.name as group_name,
  tu.team_id as group_id,
  tu.title,
  tu.body,
  tu.image_url,
  tu.created_at
from public.team_updates tu
join public.teams t on t.id = tu.team_id

union all

-- Branch announcements
select
  ba.id as id,
  'branch_announcement'::text as source_type,
  ba.id as source_id,
  ba.author_id,
  b.name as group_name,
  ba.branch_id as group_id,
  ba.title,
  ba.body,
  ba.image_url,
  ba.created_at
from public.branch_announcements ba
join public.branches b on b.id = ba.branch_id

union all

-- Platform activities (gives the feed life)
select
  a.id as id,
  'activity'::text as source_type,
  a.id as source_id,
  a.user_id as author_id,
  null::text as group_name,
  null::uuid as group_id,
  case
    when a.type = 'created_project' then 'created ' || (a.metadata->>'project_name')
    when a.type = 'created_team' then 'created ' || (a.metadata->>'team_name')
    when a.type = 'joined_branch' then 'joined ' || (a.metadata->>'branch_name')
    when a.type = 'created_branch' then 'created ' || (a.metadata->>'branch_name')
    when a.type = 'created_project_update' then 'posted an update in ' || (a.metadata->>'project_name')
    when a.type = 'created_team_update' then 'posted an update in ' || (a.metadata->>'team_name')
    when a.type = 'created_branch_announcement' then 'posted an announcement in ' || (a.metadata->>'branch_name')
    when a.type = 'created_branch_event' then 'announced an event in ' || (a.metadata->>'branch_name')
    when a.type = 'created_branch_highlight' then 'added a highlight in ' || (a.metadata->>'branch_name')
    else a.type
  end as title,
  null::text as body,
  null::text as image_url,
  a.created_at
from public.activities a
where a.type not like 'deleted_%';

grant select on public.feed_items to anon, authenticated, service_role;

-- ── Grants for new RPCs ────────────────────────────────────────────────────

grant execute on function public.assign_branch_manager(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.remove_branch_manager(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.create_branch_announcement(uuid, text, text, text) to anon, authenticated, service_role;
grant execute on function public.update_branch_announcement(uuid, text, text, text) to anon, authenticated, service_role;
grant execute on function public.update_branch_announcement_image(uuid, text) to anon, authenticated, service_role;
grant execute on function public.delete_branch_announcement(uuid) to anon, authenticated, service_role;
grant execute on function public.create_branch_event(uuid, text, timestamptz, text, text, timestamptz, text, text, text) to anon, authenticated, service_role;
grant execute on function public.update_branch_event(uuid, text, text, text, timestamptz, timestamptz, text, text, text) to anon, authenticated, service_role;
grant execute on function public.delete_branch_event(uuid) to anon, authenticated, service_role;
grant execute on function public.create_branch_highlight(uuid, text, text, text, text, int) to anon, authenticated, service_role;
grant execute on function public.update_branch_highlight(uuid, text, text, text, text, int) to anon, authenticated, service_role;
grant execute on function public.delete_branch_highlight(uuid) to anon, authenticated, service_role;
