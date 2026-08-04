-- Migration: 00052_ecosystem_lifecycle
--
-- Implements the Team & Project Lifecycle (v1 Ecosystem Rules):
--   1. One-team ownership limit (a user may own at most one team).
--   2. Five-team membership cap (join requests AND invitation acceptance).
--   3. Project inactivity lifecycle: ACTIVE -> INACTIVE (30d) -> ARCHIVED (60d).
--   4. Team inactivity lifecycle: inactive badge at 45d, hidden from discovery
--      at 90d, never auto-deleted; the owner can instantly reactivate.
--   5. Seven-day ownership cooldown after deleting a team or transferring
--      ownership (blocks creating another team in the meantime).
--
-- Design notes:
--   - Every rule is enforced inside SECURITY DEFINER RPCs (server-side).
--     The client can never bypass a limit.
--   - Platform admins (platform_admins) are exempt from the ownership limit,
--     the membership cap, and the ownership cooldown.
--   - Thresholds live in public.ecosystem_config (single row) so they are
--     configurable without code changes; nothing is hardcoded in the app.
--   - "Meaningful activity" is tracked via last_activity_at. It is bumped by
--     triggers on feed updates, member changes, and profile edits (description,
--     logo/banner, name, visibility, technologies, links).
--   - Public.refresh_all_lifecycles() reconciles the stored statuses and is the
--     hook a scheduled cleanup job (e.g. pg_cron / external cron) can call.

-- ── 1. New columns ───────────────────────────────────────────────────────────

alter table public.teams
  add column if not exists status text not null default 'active'
    check (status in ('active', 'inactive')),
  add column if not exists last_activity_at timestamptz not null default now();

alter table public.projects
  add column if not exists lifecycle_status text not null default 'ACTIVE'
    check (lifecycle_status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  add column if not exists last_activity_at timestamptz not null default now();

alter table public.profiles
  add column if not exists team_owner_cooldown_until timestamptz;

create index if not exists idx_teams_last_activity_at
  on public.teams(last_activity_at desc);
create index if not exists idx_projects_last_activity_at
  on public.projects(last_activity_at desc);

-- ── 2. Ecosystem config (single source of truth for thresholds) ─────────────

create table if not exists public.ecosystem_config (
  id boolean primary key default true check (id = true),
  project_inactive_days int not null default 30,
  project_archive_days int not null default 60,
  team_inactive_days int not null default 45,
  team_hidden_days int not null default 90,
  ownership_cooldown_days int not null default 7
);

insert into public.ecosystem_config (id)
values (true)
on conflict (id) do nothing;

grant select on public.ecosystem_config to authenticated, service_role;

-- ── 3. Helpers: activity touch + lifecycle computation ───────────────────────

-- Marks a team as active again (any meaningful activity reactivates it).
create or replace function public.touch_team(p_team_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.teams
  set last_activity_at = now(),
      status = 'active'
  where id = p_team_id;
end;
$$;

-- Marks a project as active again. ARCHIVED projects are never resurrected by
-- activity — the owner must explicitly restore them.
create or replace function public.touch_project(p_project_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.projects
  set last_activity_at = now(),
      lifecycle_status = case when lifecycle_status = 'INACTIVE' then 'ACTIVE' else lifecycle_status end
  where id = p_project_id
    and lifecycle_status is distinct from 'ARCHIVED';
end;
$$;

create or replace function public.compute_project_lifecycle(p_last_activity_at timestamptz)
returns text
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_inactive_days int;
  v_archive_days int;
  v_age interval;
begin
  if p_last_activity_at is null then
    return 'ACTIVE';
  end if;

  select project_inactive_days, project_archive_days
  into v_inactive_days, v_archive_days
  from public.ecosystem_config
  where id = true;

  v_age := now() - p_last_activity_at;

  if v_age > make_interval(days => v_archive_days) then
    return 'ARCHIVED';
  elsif v_age > make_interval(days => v_inactive_days) then
    return 'INACTIVE';
  end if;

  return 'ACTIVE';
end;
$$;

create or replace function public.refresh_project_lifecycle(p_project_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.projects
  set lifecycle_status = public.compute_project_lifecycle(last_activity_at)
  where id = p_project_id;
end;
$$;

create or replace function public.refresh_team_status(p_team_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_inactive_days int;
begin
  select team_inactive_days into v_inactive_days
  from public.ecosystem_config
  where id = true;

  update public.teams
  set status = case
    when last_activity_at < now() - make_interval(days => v_inactive_days) then 'inactive'
    else 'active'
  end
  where id = p_team_id;
end;
$$;

-- Reconciles every stored lifecycle status. This is the hook a scheduled
-- cleanup job (pg_cron / external cron / Supabase scheduled function) calls.
create or replace function public.refresh_all_lifecycles()
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  v_changed int := 0;
  v_row_count int;
begin
  update public.projects p
  set lifecycle_status = public.compute_project_lifecycle(p.last_activity_at)
  where p.lifecycle_status is distinct from public.compute_project_lifecycle(p.last_activity_at);

  get diagnostics v_row_count = row_count;
  v_changed := v_changed + v_row_count;

  update public.teams t
  set status = case
    when t.last_activity_at < now() - make_interval(
      days => (select team_inactive_days from public.ecosystem_config where id = true)
    ) then 'inactive'
    else 'active'
  end
  where t.status is distinct from case
    when t.last_activity_at < now() - make_interval(
      days => (select team_inactive_days from public.ecosystem_config where id = true)
    ) then 'inactive'
    else 'active'
  end;

  get diagnostics v_row_count = row_count;
  v_changed := v_changed + v_row_count;

  return v_changed;
end;
$$;

grant execute on function public.compute_project_lifecycle(timestamptz)
  to authenticated, service_role;
grant execute on function public.refresh_project_lifecycle(uuid)
  to authenticated, service_role;
grant execute on function public.refresh_team_status(uuid)
  to authenticated, service_role;
grant execute on function public.refresh_all_lifecycles()
  to authenticated, service_role;

-- ── 4. Explicit owner actions: reactivate / restore ─────────────────────────

-- Owner (or platform admin) can instantly reactivate an inactive/hidden team.
create or replace function public.reactivate_team(p_team_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_team_name text;
  v_team_slug text;
begin
  if not (public.is_platform_admin() or public.is_team_owner(p_team_id)) then
    raise exception 'Only the team owner can reactivate this team';
  end if;

  select name, slug into v_team_name, v_team_slug
  from public.teams
  where id = p_team_id;

  if v_team_name is null then
    raise exception 'Team not found';
  end if;

  update public.teams
  set last_activity_at = now(),
      status = 'active'
  where id = p_team_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'reactivated_team',
    jsonb_build_object('team_id', p_team_id, 'team_name', v_team_name, 'team_slug', v_team_slug)
  );
end;
$$;

grant execute on function public.reactivate_team(uuid) to authenticated, service_role;

-- Owner or admin can restore an archived project back to ACTIVE.
create or replace function public.restore_project(p_project_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_name text;
  v_project_slug text;
begin
  if not (
    public.is_platform_admin()
    or exists (
      select 1 from public.project_members
      where project_id = p_project_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  ) then
    raise exception 'Only the project owner can restore this project';
  end if;

  select name, slug into v_project_name, v_project_slug
  from public.projects
  where id = p_project_id;

  if v_project_name is null then
    raise exception 'Project not found';
  end if;

  update public.projects
  set lifecycle_status = 'ACTIVE',
      last_activity_at = now()
  where id = p_project_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'restored_project',
    jsonb_build_object(
      'project_id', p_project_id,
      'project_name', v_project_name,
      'project_slug', v_project_slug
    )
  );
end;
$$;

grant execute on function public.restore_project(uuid) to authenticated, service_role;

-- ── 5. RPC enforcement ───────────────────────────────────────────────────────

-- create_team: one-team ownership limit + ownership cooldown.
create or replace function public.create_team(
  p_name text,
  p_slug text,
  p_description text default null,
  p_visibility text default 'public',
  p_logo_url text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_team_id uuid;
  v_cooldown timestamptz;
begin
  if public.is_platform_admin() is false then
    if exists (
      select 1 from public.teams where owner_id = auth.uid()
    ) then
      raise exception 'You can only own one team. Transfer ownership or delete your current team first.';
    end if;

    select team_owner_cooldown_until into v_cooldown
    from public.profiles
    where id = auth.uid();

    if v_cooldown is not null and v_cooldown > now() then
      raise exception 'Team ownership is on cooldown. You can create a new team after % (UTC).', to_char(v_cooldown, 'YYYY-MM-DD HH24:MI');
    end if;
  end if;

  insert into public.teams (slug, name, description, visibility, logo_url, owner_id)
  values (p_slug, p_name, p_description, p_visibility, p_logo_url, auth.uid())
  returning id into v_team_id;

  insert into public.team_members (team_id, user_id, role)
  values (v_team_id, auth.uid(), 'owner');

  insert into public.team_roles (team_id, name)
  values (v_team_id, 'Member');

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'created_team',
    jsonb_build_object(
      'team_id', v_team_id,
      'team_name', p_name,
      'team_slug', p_slug
    )
  );

  return v_team_id;
end;
$$;

grant execute on function public.create_team(text, text, text, text, text)
  to anon, authenticated, service_role;

-- request_team_join: five-team membership cap.
create or replace function public.request_team_join(
  p_team_id uuid,
  p_message text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_team_name text;
  v_team_slug text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if public.is_platform_admin() is false
     and (select count(*) from public.team_members where user_id = auth.uid()) >= 5 then
    raise exception 'You can join at most 5 teams. Leave a team before requesting to join another.';
  end if;

  select name, slug into v_team_name, v_team_slug
  from public.teams where id = p_team_id;

  if v_team_name is null then
    raise exception 'Team not found';
  end if;

  if exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
  ) then
    raise exception 'You are already a member of this team';
  end if;

  if exists (
    select 1 from public.team_join_requests
    where team_id = p_team_id and user_id = auth.uid() and status = 'PENDING'
  ) then
    raise exception 'You have already requested to join this team';
  end if;

  insert into public.team_join_requests (team_id, user_id, message)
  values (p_team_id, auth.uid(), p_message)
  on conflict (team_id, user_id)
  do update set
    status = 'PENDING',
    message = excluded.message,
    reviewed_by = null,
    reviewed_at = null,
    updated_at = now();

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'requested_team_join',
    jsonb_build_object('team_id', p_team_id, 'team_name', v_team_name, 'team_slug', v_team_slug)
  );
end;
$$;

grant execute on function public.request_team_join(uuid, text) to authenticated, service_role;

-- review_team_join_request: reject acceptance when the applicant is already in
-- five teams.
create or replace function public.review_team_join_request(
  p_request_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_team_id uuid;
  v_user_id uuid;
  v_team_name text;
  v_team_slug text;
begin
  select team_id, user_id into v_team_id, v_user_id
  from public.team_join_requests
  where id = p_request_id;

  if v_team_id is null then
    raise exception 'Request not found';
  end if;

  if not (public.is_platform_admin() or public.is_team_owner(v_team_id)) then
    raise exception 'Only the team owner or a platform admin can review join requests';
  end if;

  select name, slug into v_team_name, v_team_slug
  from public.teams where id = v_team_id;

  if p_accept
     and public.is_platform_admin() is false
     and (select count(*) from public.team_members where user_id = v_user_id) >= 5 then
    raise exception 'This user is already a member of 5 teams.';
  end if;

  update public.team_join_requests
  set status = case when p_accept then 'ACCEPTED' else 'DECLINED' end,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = p_request_id and status = 'PENDING';

  if not found then
    raise exception 'This request has already been reviewed';
  end if;

  if p_accept then
    insert into public.team_members (team_id, user_id, role)
    values (v_team_id, v_user_id, 'member')
    on conflict (team_id, user_id) do nothing;

    insert into public.activities (user_id, type, metadata)
    values (
      v_user_id,
      'joined_team',
      jsonb_build_object('team_id', v_team_id, 'team_name', v_team_name, 'team_slug', v_team_slug)
    );
  end if;
end;
$$;

grant execute on function public.review_team_join_request(uuid, boolean) to authenticated, service_role;

-- invite_team_member: refuse inviting someone who is already in five teams.
create or replace function public.invite_team_member(
  p_team_id uuid,
  p_username text default null,
  p_email text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_invited_user_id uuid;
  v_team_name text;
  v_team_slug text;
begin
  if not (public.is_platform_admin() or public.is_team_owner(p_team_id)) then
    raise exception 'Only the team owner or a platform admin can send invitations';
  end if;

  if (p_username is null or p_username = '') and (p_email is null or p_email = '') then
    raise exception 'Provide a username or email';
  end if;

  if p_username is not null and p_username <> '' then
    select id into v_invited_user_id
    from public.profiles
    where lower(username) = lower(p_username)
    limit 1;
  else
    select id into v_invited_user_id
    from auth.users
    where lower(email) = lower(p_email)
    limit 1;
  end if;

  if v_invited_user_id is null then
    raise exception 'No user found with that username or email';
  end if;

  if exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = v_invited_user_id
  ) then
    raise exception 'This user is already a member of the team';
  end if;

  if public.is_platform_admin() is false
     and (select count(*) from public.team_members where user_id = v_invited_user_id) >= 5 then
    raise exception 'This user is already a member of 5 teams.';
  end if;

  if exists (
    select 1 from public.team_invitations
    where team_id = p_team_id and invited_user_id = v_invited_user_id and status = 'PENDING'
  ) then
    raise exception 'This user has already been invited to this team';
  end if;

  insert into public.team_invitations (team_id, invited_user_id, invited_by)
  values (p_team_id, v_invited_user_id, auth.uid())
  on conflict (team_id, invited_user_id)
  do update set
    status = 'PENDING',
    invited_by = excluded.invited_by,
    updated_at = now();

  select name, slug into v_team_name, v_team_slug
  from public.teams where id = p_team_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'invited_team_member',
    jsonb_build_object(
      'team_id', p_team_id,
      'team_name', v_team_name,
      'team_slug', v_team_slug,
      'invited_user_id', v_invited_user_id
    )
  );
end;
$$;

grant execute on function public.invite_team_member(uuid, text, text) to authenticated, service_role;

-- respond_to_invitation: reject acceptance when the invitee is already in five
-- teams.
create or replace function public.respond_to_invitation(
  p_invitation_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_team_id uuid;
  v_team_name text;
  v_team_slug text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select team_id into v_team_id
  from public.team_invitations
  where id = p_invitation_id;

  if v_team_id is null then
    raise exception 'Invitation not found';
  end if;

  if not exists (
    select 1 from public.team_invitations
    where id = p_invitation_id and invited_user_id = auth.uid()
  ) then
    raise exception 'This invitation is not addressed to you';
  end if;

  if p_accept
     and public.is_platform_admin() is false
     and (select count(*) from public.team_members where user_id = auth.uid()) >= 5 then
    raise exception 'You are already a member of 5 teams. Leave a team before accepting this invitation.';
  end if;

  select name, slug into v_team_name, v_team_slug
  from public.teams where id = v_team_id;

  update public.team_invitations
  set status = case when p_accept then 'ACCEPTED' else 'DECLINED' end,
      updated_at = now()
  where id = p_invitation_id and status = 'PENDING';

  if not found then
    raise exception 'This invitation has already been responded to';
  end if;

  if p_accept then
    insert into public.team_members (team_id, user_id, role)
    values (v_team_id, auth.uid(), 'member')
    on conflict (team_id, user_id) do nothing;

    insert into public.activities (user_id, type, metadata)
    values (
      auth.uid(),
      'joined_team',
      jsonb_build_object('team_id', v_team_id, 'team_name', v_team_name, 'team_slug', v_team_slug)
    );
  end if;
end;
$$;

grant execute on function public.respond_to_invitation(uuid, boolean) to authenticated, service_role;

-- transfer_team_ownership: start the ownership cooldown for the old owner.
create or replace function public.transfer_team_ownership(p_team_id uuid, p_new_owner_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_current_owner_id uuid;
  v_team_name text;
  v_new_owner_name text;
  v_member_count int;
  v_new_owner_role text;
  v_cooldown_days int;
begin
  select owner_id into v_current_owner_id
  from public.teams
  where id = p_team_id;

  if v_current_owner_id is null then
    raise exception 'Team not found';
  end if;

  if auth.uid() <> v_current_owner_id then
    raise exception 'Only the current owner can transfer ownership';
  end if;

  if p_new_owner_id = v_current_owner_id then
    raise exception 'Cannot transfer ownership to yourself';
  end if;

  select count(*) into v_member_count
  from public.team_members
  where team_id = p_team_id;

  if v_member_count < 2 then
    raise exception 'There is nobody to transfer ownership to';
  end if;

  select role into v_new_owner_role
  from public.team_members
  where team_id = p_team_id and user_id = p_new_owner_id;

  if v_new_owner_role is null then
    raise exception 'Target user is not a member of this team';
  end if;

  select name into v_team_name from public.teams where id = p_team_id;
  select full_name into v_new_owner_name from public.profiles where id = p_new_owner_id;

  update public.teams
  set owner_id = p_new_owner_id,
      updated_at = now()
  where id = p_team_id;

  update public.team_members
  set role = 'admin'
  where team_id = p_team_id and user_id = v_current_owner_id;

  update public.team_members
  set role = 'owner'
  where team_id = p_team_id and user_id = p_new_owner_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'transferred_team_ownership',
    jsonb_build_object(
      'team_id', p_team_id,
      'team_name', v_team_name,
      'old_owner', v_current_owner_id,
      'new_owner', p_new_owner_id,
      'new_owner_name', v_new_owner_name
    )
  );

  if public.is_platform_admin() is false then
    select ownership_cooldown_days into v_cooldown_days
    from public.ecosystem_config
    where id = true;

    update public.profiles
    set team_owner_cooldown_until = now() + make_interval(days => v_cooldown_days)
    where id = v_current_owner_id;
  end if;
end;
$$;

grant execute on function public.transfer_team_ownership(uuid, uuid) to authenticated, service_role;

-- delete_team: start the ownership cooldown for the deleting owner.
create or replace function public.delete_team(p_team_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner_id uuid;
  v_team_name text;
  v_team_slug text;
  v_project record;
  v_cooldown_days int;
begin
  select owner_id, name, slug into v_owner_id, v_team_name, v_team_slug
  from public.teams
  where id = p_team_id;

  if v_owner_id is null then
    raise exception 'Team not found';
  end if;

  if v_owner_id <> auth.uid() then
    raise exception 'Only the owner can delete this team';
  end if;

  -- Delete storage: team logos and banners
  delete from storage.objects
  where bucket_id = 'team-logos'
    and (name like p_team_id || '/%' or name like 'banners/' || p_team_id || '/%');

  -- Delete storage: team update images
  delete from storage.objects
  where bucket_id = 'team-updates'
    and name like p_team_id || '/%';

  for v_project in
    select id, name, slug from public.projects where team_id = p_team_id
  loop
    delete from storage.objects
    where bucket_id = 'project-logos'
      and name like v_project.id || '/%';

    delete from storage.objects
    where bucket_id = 'project-updates'
      and name like v_project.id || '/%';

    delete from public.activities
    where metadata->>'project_id' = v_project.id::text;

    insert into public.activities (user_id, type, metadata)
    values (
      auth.uid(),
      'deleted_project',
      jsonb_build_object(
        'project_id', v_project.id,
        'project_name', v_project.name,
        'project_slug', v_project.slug
      )
    );
  end loop;

  delete from public.team_open_roles where team_id = p_team_id;
  delete from public.team_members where team_id = p_team_id;

  delete from public.activities
  where metadata->>'team_id' = p_team_id::text;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'deleted_team',
    jsonb_build_object(
      'team_id', p_team_id,
      'team_name', v_team_name,
      'team_slug', v_team_slug
    )
  );

  delete from public.teams where id = p_team_id;

  if public.is_platform_admin() is false then
    select ownership_cooldown_days into v_cooldown_days
    from public.ecosystem_config
    where id = true;

    update public.profiles
    set team_owner_cooldown_until = now() + make_interval(days => v_cooldown_days)
    where id = v_owner_id;
  end if;
end;
$$;

grant execute on function public.delete_team(uuid) to anon, authenticated, service_role;

-- ── 6. Activity triggers ─────────────────────────────────────────────────────
-- Meaningful activity = feed updates, member changes, and profile edits.
-- These keep last_activity_at (and therefore the lifecycle) accurate no matter
-- which code path performs the write.

create or replace function public.trg_team_updates_touch()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.touch_team(NEW.team_id);
  return NEW;
end;
$$;

create or replace function public.trg_team_members_touch()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_team_id uuid;
begin
  v_team_id := coalesce(NEW.team_id, OLD.team_id);
  if v_team_id is not null then
    perform public.touch_team(v_team_id);
  end if;
  return coalesce(NEW, OLD);
end;
$$;

create or replace function public.trg_teams_touch()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.touch_team(NEW.id);
  return NEW;
end;
$$;

create or replace function public.trg_project_updates_touch()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.touch_project(NEW.project_id);
  return NEW;
end;
$$;

create or replace function public.trg_project_members_touch()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
begin
  v_project_id := coalesce(NEW.project_id, OLD.project_id);
  if v_project_id is not null then
    perform public.touch_project(v_project_id);
  end if;
  return coalesce(NEW, OLD);
end;
$$;

create or replace function public.trg_projects_touch()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.touch_project(NEW.id);
  return NEW;
end;
$$;

drop trigger if exists team_updates_touch on public.team_updates;
create trigger team_updates_touch
  after insert on public.team_updates
  for each row execute function public.trg_team_updates_touch();

drop trigger if exists team_members_touch on public.team_members;
create trigger team_members_touch
  after insert or delete or update of role on public.team_members
  for each row execute function public.trg_team_members_touch();

drop trigger if exists teams_touch on public.teams;
create trigger teams_touch
  after update of name, slug, description, visibility, logo_url, banner_url, technologies on public.teams
  for each row execute function public.trg_teams_touch();

drop trigger if exists project_updates_touch on public.project_updates;
create trigger project_updates_touch
  after insert on public.project_updates
  for each row execute function public.trg_project_updates_touch();

drop trigger if exists project_members_touch on public.project_members;
create trigger project_members_touch
  after insert or delete or update of role on public.project_members
  for each row execute function public.trg_project_members_touch();

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch
  after update of name, slug, description, description_long, visibility, logo_url, website, github_url, technologies on public.projects
  for each row execute function public.trg_projects_touch();

-- ── 7. Backfill existing rows ────────────────────────────────────────────────
-- Seed last_activity_at from updated_at/created_at so pre-existing teams and
-- projects get a sane lifecycle baseline, then reconcile stored statuses.

update public.teams
set last_activity_at = coalesce(updated_at, created_at, now());

update public.projects
set last_activity_at = coalesce(updated_at, created_at, now());

update public.projects
set lifecycle_status = public.compute_project_lifecycle(last_activity_at);

update public.teams
set status = case
  when last_activity_at < now() - make_interval(
    days => (select team_inactive_days from public.ecosystem_config where id = true)
  ) then 'inactive'
  else 'active'
end;
