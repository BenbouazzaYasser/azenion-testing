-- Migration: 00030_branch_ecosystem
--
-- Finalizes the Branch ecosystem:
--   1. Branch Managers -> Branch Leaders (first-class role; Platform Admin
--      appoints/removes them, they manage only their own branch).
--   2. Events: text-based `schedule` column. `starts_at` becomes nullable and
--      is derived from the schedule text as an ordering key until a real
--      scheduler exists.
--   3. Announcements: `is_pinned` so branch leaders / platform admin can pin
--      posts above the feed.
--
-- Branch data stays normalized: `teams.branch_id` is the single source of
-- truth. Projects and posts inherit their branch through joins — no branch_id
-- is ever duplicated on projects or post tables.

-- ── 1. Branch Leaders ─────────────────────────────────────────────────────

alter table public.branch_managers rename to branch_leaders;

alter index if exists idx_branch_managers_branch_id rename to idx_branch_leaders_branch_id;
alter index if exists idx_branch_managers_user_id rename to idx_branch_leaders_user_id;
alter table public.branch_leaders
  rename constraint branch_managers_branch_id_user_id_key to branch_leaders_branch_id_user_id_key;
alter index if exists branch_managers_branch_id_user_id_key rename to branch_leaders_branch_id_user_id_key;

-- RPC: is_branch_leader (replaces is_branch_manager)
create or replace function public.is_branch_leader(
  p_branch_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.branch_leaders
    where branch_id = p_branch_id and user_id = p_user_id
  );
$$;

grant execute on function public.is_branch_leader(uuid, uuid) to anon, authenticated, service_role;

-- Policies referencing the old function must be dropped before it is dropped.
drop policy if exists "branch managers can create announcements" on public.branch_announcements;
drop policy if exists "branch managers can update announcements" on public.branch_announcements;
drop policy if exists "branch managers can delete announcements" on public.branch_announcements;
drop policy if exists "branch managers can create events" on public.branch_events;
drop policy if exists "branch managers can update events" on public.branch_events;
drop policy if exists "branch managers can delete events" on public.branch_events;
drop policy if exists "branch managers can create highlights" on public.branch_highlights;
drop policy if exists "branch managers can update highlights" on public.branch_highlights;
drop policy if exists "branch managers can delete highlights" on public.branch_highlights;
drop policy if exists "branch managers can upload branch assets" on storage.objects;
drop policy if exists "branch managers can update branch assets" on storage.objects;
drop policy if exists "branch managers can delete branch assets" on storage.objects;

drop function if exists public.is_branch_manager(uuid, uuid);

create policy "branch leaders can create announcements"
  on public.branch_announcements for insert
  with check (
    auth.uid() = author_id
    and public.is_branch_leader(branch_id)
  );

create policy "branch leaders can update announcements"
  on public.branch_announcements for update
  using (public.is_branch_leader(branch_id));

create policy "branch leaders can delete announcements"
  on public.branch_announcements for delete
  using (public.is_branch_leader(branch_id));

create policy "branch leaders can create events"
  on public.branch_events for insert
  with check (public.is_branch_leader(branch_id));

create policy "branch leaders can update events"
  on public.branch_events for update
  using (public.is_branch_leader(branch_id));

create policy "branch leaders can delete events"
  on public.branch_events for delete
  using (public.is_branch_leader(branch_id));

create policy "branch leaders can create highlights"
  on public.branch_highlights for insert
  with check (public.is_branch_leader(branch_id));

create policy "branch leaders can update highlights"
  on public.branch_highlights for update
  using (public.is_branch_leader(branch_id));

create policy "branch leaders can delete highlights"
  on public.branch_highlights for delete
  using (public.is_branch_leader(branch_id));

create policy "branch leaders can upload branch assets"
  on storage.objects for insert with check (
    bucket_id = 'branch-assets'
    and (
      public.is_branch_leader((storage.foldername(name))[1]::uuid)
      or public.is_platform_admin()
    )
  );

create policy "branch leaders can update branch assets"
  on storage.objects for update using (
    bucket_id = 'branch-assets'
    and (
      public.is_branch_leader((storage.foldername(name))[1]::uuid)
      or public.is_platform_admin()
    )
  );

create policy "branch leaders can delete branch assets"
  on storage.objects for delete using (
    bucket_id = 'branch-assets'
    and (
      public.is_branch_leader((storage.foldername(name))[1]::uuid)
      or public.is_platform_admin()
    )
  );

-- ── RPC: assign_branch_leader / remove_branch_leader (Platform Admin only) ─

drop function if exists public.assign_branch_manager(uuid, uuid);
drop function if exists public.remove_branch_manager(uuid, uuid);

create or replace function public.assign_branch_leader(
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
    raise exception 'Only the platform administrator can assign branch leaders';
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

  insert into public.branch_leaders (branch_id, user_id, assigned_by)
  values (p_branch_id, p_user_id, auth.uid())
  on conflict (branch_id, user_id)
  do update set assigned_by = excluded.assigned_by;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'assigned_branch_leader',
    jsonb_build_object(
      'branch_id', p_branch_id,
      'branch_name', v_branch_name,
      'leader_user_id', p_user_id,
      'leader_username', v_username
    )
  );
end;
$$;

create or replace function public.remove_branch_leader(
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
  v_leader_count int;
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform administrator can remove branch leaders';
  end if;

  select count(*) into v_leader_count
  from public.branch_leaders
  where branch_id = p_branch_id;

  if v_leader_count <= 1 then
    raise exception 'A branch must keep at least one leader';
  end if;

  select name into v_branch_name
  from public.branches
  where id = p_branch_id;

  select username into v_username
  from public.profiles
  where id = p_user_id;

  delete from public.branch_leaders
  where branch_id = p_branch_id and user_id = p_user_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'removed_branch_leader',
    jsonb_build_object(
      'branch_id', p_branch_id,
      'branch_name', v_branch_name,
      'leader_user_id', p_user_id,
      'leader_username', v_username
    )
  );
end;
$$;

-- ── 2. Events: text schedule ─────────────────────────────────────────────

alter table public.branch_events
  add column if not exists schedule text;

alter table public.branch_events
  alter column starts_at drop not null;

-- ── 3. Announcements: pinned ──────────────────────────────────────────────

alter table public.branch_announcements
  add column if not exists is_pinned boolean not null default false;

-- ── RPC refresh: use branch leaders + new params ──────────────────────────

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
  if not public.is_platform_admin() and not public.is_branch_leader(p_branch_id) then
    raise exception 'Only the platform administrator or a branch leader can update a branch';
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

drop function if exists public.create_branch_announcement(uuid, text, text, text);
drop function if exists public.update_branch_announcement(uuid, text, text, text);

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

  insert into public.branch_announcements (branch_id, author_id, title, body, image_url, is_pinned)
  values (p_branch_id, auth.uid(), p_title, p_body, p_image_url, p_is_pinned)
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
    is_pinned  = coalesce(p_is_pinned, is_pinned),
    updated_at = now()
  where id = p_announcement_id;
end;
$$;

drop function if exists public.create_branch_event(uuid, text, timestamptz, text, text, timestamptz, text, text, text);
drop function if exists public.update_branch_event(uuid, text, text, text, timestamptz, timestamptz, text, text, text);

create or replace function public.create_branch_event(
  p_branch_id uuid,
  p_title text,
  p_starts_at timestamptz default null,
  p_description text default null,
  p_location text default null,
  p_ends_at timestamptz default null,
  p_cover_url text default null,
  p_registration_url text default null,
  p_visibility text default 'public',
  p_schedule text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_event_id uuid;
  v_branch_name text;
begin
  if not public.is_branch_leader(p_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch leaders can create events';
  end if;

  select name into v_branch_name
  from public.branches
  where id = p_branch_id;

  if v_branch_name is null then
    raise exception 'Branch not found';
  end if;

  insert into public.branch_events (
    branch_id, title, description, location, starts_at, ends_at,
    cover_url, registration_url, visibility, schedule
  )
  values (
    p_branch_id, p_title, p_description, p_location, p_starts_at, p_ends_at,
    p_cover_url, p_registration_url, p_visibility, p_schedule
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

create or replace function public.update_branch_event(
  p_event_id uuid,
  p_title text default null,
  p_description text default null,
  p_location text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_cover_url text default null,
  p_registration_url text default null,
  p_visibility text default null,
  p_schedule text default null
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

  if not public.is_branch_leader(v_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch leaders can edit events';
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
    schedule          = coalesce(p_schedule, schedule),
    updated_at        = now()
  where id = p_event_id;
end;
$$;

-- ── Grants ────────────────────────────────────────────────────────────────

grant select, insert, update, delete
  on public.branch_leaders to anon, authenticated, service_role;

grant execute on function public.assign_branch_leader(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.remove_branch_leader(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.create_branch_announcement(uuid, text, text, text, boolean) to anon, authenticated, service_role;
grant execute on function public.update_branch_announcement(uuid, text, text, text, boolean) to anon, authenticated, service_role;
grant execute on function public.create_branch_event(uuid, text, timestamptz, text, text, timestamptz, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.update_branch_event(uuid, text, text, text, timestamptz, timestamptz, text, text, text, text) to anon, authenticated, service_role;
