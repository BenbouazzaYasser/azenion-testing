-- Migration: 00141_team_course_publisher
--
-- Academy Course Publisher team capability.
--
-- Problem: courses today can only be published by platform-level course
-- managers (`is_course_manager()`). There is no server-enforced concept of a
-- team publishing a course on behalf of an organization.
--
-- This migration introduces:
--   * public.team_capabilities        — per-team capabilities, RPC-managed.
--       Only `platform_admin` can toggle them. The first capability is
--       `course_publisher`, and it is the higher-level gate: when OFF,
--       nobody can publish for the team, regardless of role permissions.
--   * PUBLISH_COURSES                 — new permission in the team role
--       catalog (mirrors lib/team-permissions.ts). Team owner always holds
--       it implicitly (has_team_permission hardcodes the owner); members
--       need a role carrying it. Assigning it to legacy-role members is
--       blocked (assign_member_roles rejects owner; role assignments are
--       owner-only via set_role_permissions / assign_member_roles).
--   * courses publisher columns       — publisher_type ('user'|'team'),
--       publisher_team_id (FK teams, RESTRICT), published_by (FK profiles),
--       published_at. creation is separate from publishing: a course is
--       created as a draft and publishing goes through publish_course().
--   * public.course_publish_events    — append-only audit trail of every
--       publish / republish / unpublish, recording the actor and the
--       publisher identity at the time of the event.
--   * public.get_manageable_course_publisher_teams() — server-authoritative
--       list of teams the caller may publish for (capability ON + owner or
--       PUBLISH_COURSES role). The UI never trusts a client-supplied team id.
--   * public.publish_course() / public.unpublish_course() — the ONLY way a
--       course transitions to/from published. Re-validates all conditions
--       server-side on every call and writes the audit event.
--
-- Design notes:
--   * is_course_manager() is NOT changed. Team publishing adds a separate,
--     server-validated authorization path; it does not widen course-manager
--     privileges.
--   * Existing courses are backfilled as individually user-published with
--     their existing creator as published_by (published_at = created_at) so
--     no historical course is orphaned and the constraint below always holds.
--   * publisher_team_id uses ON DELETE RESTRICT (not SET NULL): deleting a
--     team must not silently detach historical team-published courses into
--     a misleading publisher_type='team' with a null team.

-- ── Table: team_capabilities ─────────────────────────────────────────────────

create table if not exists public.team_capabilities (
  team_id uuid not null references public.teams(id) on delete cascade,
  capability text not null check (capability in ('course_publisher')),
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (team_id, capability)
);

alter table public.team_capabilities enable row level security;

drop policy if exists "team members can read team capabilities" on public.team_capabilities;
create policy "team members can read team capabilities"
  on public.team_capabilities for select
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.team_members
      where team_id = team_capabilities.team_id
        and user_id = auth.uid()
    )
  );

create index if not exists idx_team_capabilities_team_id on public.team_capabilities(team_id);

grant select on public.team_capabilities to authenticated;
grant all on public.team_capabilities to service_role;

-- ── Permission catalog: add PUBLISH_COURSES ─────────────────────────────────
-- Recreates set_role_permissions with the widened allow-list. Mirrors the new
-- TeamPermission.PUBLISH_COURSES entry in lib/team-permissions.ts.

create or replace function public.set_role_permissions(
  p_role_id uuid,
  p_permissions text[]
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_team_id uuid;
  v_permission text;
  v_allowed text[] := array[
    'INVITE_MEMBERS', 'REVIEW_JOIN_REQUESTS', 'REMOVE_MEMBERS',
    'CREATE_FEED_POSTS', 'EDIT_FEED_POSTS', 'DELETE_FEED_POSTS',
    'CREATE_PROJECTS', 'EDIT_PROJECTS', 'ARCHIVE_PROJECTS',
    'CREATE_LIVE_SESSIONS', 'MANAGE_LIVE_SESSIONS',
    'EDIT_TEAM_INFORMATION', 'EDIT_TEAM_APPEARANCE',
    'PUBLISH_COURSES'
  ];
begin
  select team_id into v_team_id
  from public.team_roles where id = p_role_id;

  if v_team_id is null then
    raise exception 'Role not found';
  end if;

  if not (public.is_platform_admin() or public.is_team_owner(v_team_id)) then
    raise exception 'Only the team owner can edit role permissions';
  end if;

  foreach v_permission in array p_permissions loop
    if not (v_permission = any(v_allowed)) then
      raise exception 'Unknown permission: %', v_permission;
    end if;
  end loop;

  delete from public.team_role_permissions where role_id = p_role_id;

  if p_permissions is not null and cardinality(p_permissions) > 0 then
    insert into public.team_role_permissions (role_id, permission)
    select distinct p_role_id, unnest(p_permissions);
  end if;
end;
$$;

grant execute on function public.set_role_permissions(uuid, text[]) to authenticated, service_role;

-- ── RPC: set_team_capability ─────────────────────────────────────────────────
-- Platform-admin only. Enables or disables a capability for a team.

create or replace function public.set_team_capability(
  p_team_id uuid,
  p_capability text,
  p_enabled boolean
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only platform admins can manage team capabilities';
  end if;

  if p_capability is null or p_capability not in ('course_publisher') then
    raise exception 'Unknown capability: %', p_capability;
  end if;

  if not exists (select 1 from public.teams where id = p_team_id) then
    raise exception 'Team not found';
  end if;

  if p_enabled then
    insert into public.team_capabilities (team_id, capability, granted_by)
    values (p_team_id, p_capability, auth.uid())
    on conflict (team_id, capability) do nothing;
  else
    delete from public.team_capabilities
    where team_id = p_team_id and capability = p_capability;
  end if;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'set_team_capability',
    jsonb_build_object('team_id', p_team_id, 'capability', p_capability, 'enabled', p_enabled)
  );
end;
$$;

grant execute on function public.set_team_capability(uuid, text, boolean) to authenticated, service_role;

-- ── RPC: get_team_capabilities ───────────────────────────────────────────────
-- Capabilities currently enabled for a team. Readable by team members /
-- platform admins; used by the team settings UI.

create or replace function public.get_team_capabilities(p_team_id uuid)
returns table (
  capability text,
  granted_at timestamptz
)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  if not (public.is_platform_admin() or exists (
    select 1 from public.team_members
    where team_members.team_id = p_team_id and team_members.user_id = auth.uid()
  )) then
    raise exception 'Only team members can view team capabilities';
  end if;

  return query
  select tc.capability, tc.granted_at
  from public.team_capabilities tc
  where tc.team_id = p_team_id
  order by tc.capability asc;
end;
$$;

grant execute on function public.get_team_capabilities(uuid) to authenticated, service_role;

-- ── RPC: can_publish_course_for_team ─────────────────────────────────────────
-- The single server-authoritative answer to "may the current user publish
-- courses on behalf of p_team_id?" Requires ALL of:
--   * the team exists
--   * the team has the course_publisher capability enabled (higher-level gate:
--     OFF defeats every role permission)
--   * the user is the team owner OR holds PUBLISH_COURSES via a role
--     (platform admins pass via has_team_permission's admin bypass)

create or replace function public.can_publish_course_for_team(p_team_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    exists (select 1 from public.teams where id = p_team_id)
    and exists (
      select 1 from public.team_capabilities
      where team_id = p_team_id and capability = 'course_publisher'
    )
    and public.has_team_permission(p_team_id, 'PUBLISH_COURSES');
$$;

grant execute on function public.can_publish_course_for_team(uuid) to anon, authenticated, service_role;

-- ── RPC: get_manageable_course_publisher_teams ───────────────────────────────
-- Server-authoritative list of teams the current user may publish courses
-- for. The course UI renders publisher options exclusively from this list and
-- NEVER trusts a caller-supplied team id.

create or replace function public.get_manageable_course_publisher_teams()
returns table (
  team_id uuid,
  name text,
  slug text,
  logo_url text
)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  return query
  select t.id, t.name, t.slug, t.logo_url
  from public.teams t
  where public.can_publish_course_for_team(t.id)
  order by t.name asc;
end;
$$;

grant execute on function public.get_manageable_course_publisher_teams() to authenticated, service_role;

-- ── RPC: can_create_course ───────────────────────────────────────────────────
-- Who may create course drafts? Existing course managers, plus anyone who can
-- publish for at least one team. Creating a course creates a DRAFT only; it
-- grants no publication authority of its own (publish_course re-validates).

create or replace function public.can_create_course()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.is_course_manager()
    or exists (
      select 1 from public.teams t
      where public.can_publish_course_for_team(t.id)
    );
$$;

grant execute on function public.can_create_course() to anon, authenticated, service_role;

-- ── Table: course_publish_events (append-only audit) ─────────────────────────

create table if not exists public.course_publish_events (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  action text not null check (action in ('publish', 'republish', 'unpublish')),
  publisher_type text check (publisher_type in ('user', 'team')),
  publisher_team_id uuid references public.teams(id) on delete set null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.course_publish_events enable row level security;

drop policy if exists "platform admins can read course publish events" on public.course_publish_events;
create policy "platform admins can read course publish events"
  on public.course_publish_events for select
  using ( public.is_platform_admin() );

create index if not exists idx_course_publish_events_course_id
  on public.course_publish_events(course_id);
create index if not exists idx_course_publish_events_actor_user_id
  on public.course_publish_events(actor_user_id);

grant select on public.course_publish_events to authenticated;
grant all on public.course_publish_events to service_role;

-- ── Courses: publisher columns ───────────────────────────────────────────────

alter table public.courses
  add column if not exists publisher_type text,
  add column if not exists publisher_team_id uuid references public.teams(id) on delete restrict,
  add column if not exists published_by uuid references public.profiles(id) on delete set null,
  add column if not exists published_at timestamptz;

-- Backfill: reflect the pre-existing publishing model — every existing course
-- (draft or already-published) becomes individually user-published by its
-- creator. published_at uses created_at to avoid inventing new timestamps.
update public.courses
set publisher_type = 'user',
    published_by = created_by,
    published_at = created_at
where publisher_type is null;

-- Constraints. The team-publisher shape must be internally consistent and a
-- published course must always carry a complete publisher identity.
alter table public.courses
  drop constraint if exists courses_publisher_type_check;
alter table public.courses
  add constraint courses_publisher_type_check
  check (publisher_type in ('user', 'team'));

alter table public.courses
  drop constraint if exists courses_publisher_team_consistency_check;
alter table public.courses
  add constraint courses_publisher_team_consistency_check
  check (
    (publisher_type is null and publisher_team_id is null)
    or (publisher_type = 'team' and publisher_team_id is not null)
    or (publisher_type = 'user' and publisher_team_id is null)
  );

alter table public.courses
  drop constraint if exists courses_published_identity_check;
alter table public.courses
  add constraint courses_published_identity_check
  check (
    status <> 'published'
    or (publisher_type is not null and published_by is not null and published_at is not null)
  );

create index if not exists idx_courses_publisher_team_id on public.courses(publisher_team_id);

-- ── RPC: publish_course ──────────────────────────────────────────────────────
-- The ONLY way a course becomes published. Never trusts the caller: the
-- publisher identity is derived server-side and every condition is
-- re-validated on each call.
--
--   * p_publisher_team_id = NULL  → individual publish. Requires the
--     existing course-manager authority (is_course_manager), unchanged. The
--     course is attributed to the publishing user.
--   * p_publisher_team_id set     → team publish. Requires ALL of:
--       - team exists
--       - course_publisher capability enabled for the team
--       - caller is team owner OR holds PUBLISH_COURSES
--       - caller may legitimately publish THIS course under the existing
--         course authorization model (they created it, or they are a course
--         manager). This prevents a team publisher from commandeering
--         somebody else's course.
--
-- Publishes log an event with action 'publish' (from draft/archived) or
-- 'republish' (already published, e.g. switching publisher context).

create or replace function public.publish_course(
  p_course_id uuid,
  p_publisher_team_id uuid default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_created_by uuid;
  v_prev_status text;
  v_publisher_type text;
  v_publisher_team uuid;
  v_action text;
begin
  select created_by, status into v_created_by, v_prev_status
  from public.courses where id = p_course_id;

  if v_created_by is null then
    raise exception 'Course not found';
  end if;

  if p_publisher_team_id is null then
    if not public.is_course_manager() then
      raise exception 'Not authorized to publish this course as an individual - core team only';
    end if;
    v_publisher_type := 'user';
    v_publisher_team := null;
  else
    if not public.can_publish_course_for_team(p_publisher_team_id) then
      raise exception 'Not authorized to publish this course for this team. The team must have the Course Publisher capability enabled and you must own the team or hold the Publish courses permission.';
    end if;
    if v_created_by is distinct from auth.uid() and not public.is_course_manager() then
      raise exception 'Only the creator of this course or a course manager can publish it for a team';
    end if;
    v_publisher_type := 'team';
    v_publisher_team := p_publisher_team_id;
  end if;

  v_action := case when v_prev_status = 'published' then 'republish' else 'publish' end;

  update public.courses set
    status = 'published',
    publisher_type = v_publisher_type,
    publisher_team_id = v_publisher_team,
    published_by = auth.uid(),
    published_at = now(),
    updated_at = now()
  where id = p_course_id;

  insert into public.course_publish_events (
    course_id, action, publisher_type, publisher_team_id, actor_user_id
  ) values (
    p_course_id, v_action, v_publisher_type, v_publisher_team, auth.uid()
  );
end;
$$;

grant execute on function public.publish_course(uuid, uuid) to authenticated, service_role;

-- ── RPC: unpublish_course ────────────────────────────────────────────────────
-- The ONLY way a published course is taken back to draft. Authorized for the
-- course creator, any course manager, or a team publisher who could publish
-- on behalf of the course's current publisher team. Publisher identity is
-- retained for transparency; the audit event records the transition.

create or replace function public.unpublish_course(p_course_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_created_by uuid;
  v_publisher_type text;
  v_publisher_team uuid;
begin
  select created_by, publisher_type, publisher_team_id
  into v_created_by, v_publisher_type, v_publisher_team
  from public.courses where id = p_course_id;

  if v_created_by is null then
    raise exception 'Course not found';
  end if;

  if not (
    v_created_by = auth.uid()
    or public.is_course_manager()
    or (
      v_publisher_type = 'team'
      and v_publisher_team is not null
      and public.can_publish_course_for_team(v_publisher_team)
    )
  ) then
    raise exception 'Not authorized to unpublish this course';
  end if;

  update public.courses set
    status = 'draft',
    updated_at = now()
  where id = p_course_id;

  insert into public.course_publish_events (
    course_id, action, publisher_type, publisher_team_id, actor_user_id
  ) values (
    p_course_id, 'unpublish', v_publisher_type, v_publisher_team, auth.uid()
  );
end;
$$;

grant execute on function public.unpublish_course(uuid) to authenticated, service_role;

-- ── Storage: let legitimate course creators upload their own files ──────────
-- Widen the course-files insert policy from is_course_manager() to
-- can_create_course() so team Course Publishers with an enabled capability
-- can stage their own drafts. The uploaded object must belong to the caller's
-- own `courses/<user_id>/` prefix (or the caller may be a course manager, who
-- retains the broad upload right). Update/delete of storage stays
-- manager-gated (only a manager may mutate/remove arbitrary files).

drop policy if exists "course managers can upload course files" on storage.objects;
create policy "course creators can upload course files"
  on storage.objects for insert with check (
    bucket_id = 'course-files'
    and public.can_create_course()
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or public.is_course_manager()
    )
  );