-- Migration: 00042_team_roles
--
-- Professional team RBAC: Owner → Roles → Permissions → Members.
--
-- Design notes:
--   * Permissions are NEVER stored on members. Members inherit zero or more
--     permissions from the roles they are assigned (team_member_roles).
--   * The team owner always has every permission (hardcoded in
--     has_team_permission) and never relies on a role. Owners also keep the
--     exclusive powers of role management, ownership transfer, and team
--     deletion — none of which are permission-backed.
--   * Writes to team_roles / team_role_permissions / team_member_roles are
--     RPC-only (no direct INSERT/UPDATE/DELETE policies). All role-management
--     RPCs are owner-only (is_team_owner) or platform admin.
--   * Every existing server-side gate that was "owner/admin" or "owner only"
--     is swapped to has_team_permission(...) so permissions are enforced in
--     SECURITY DEFINER functions and RLS policies, never just hidden buttons.
--   * Every team gets a default "Member" role (no permissions) on creation,
--     and existing teams are backfilled below.

-- ── Permission catalog ───────────────────────────────────────────────────────
-- Single list of every permission a role can carry. Mirrors the TeamPermission
-- enum in lib/team-permissions.ts; the DB validates writes against this list.

-- ── Table: team_roles ────────────────────────────────────────────────────────

create table if not exists public.team_roles (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, name)
);

alter table public.team_roles enable row level security;

drop policy if exists "team members can read team roles" on public.team_roles;
create policy "team members can read team roles"
  on public.team_roles for select
  using (
    exists (
      select 1 from public.team_members
      where team_id = team_roles.team_id
        and user_id = auth.uid()
    )
  );

create index if not exists idx_team_roles_team_id on public.team_roles(team_id);

grant select on public.team_roles to authenticated;
grant all on public.team_roles to service_role;

-- ── Table: team_role_permissions ─────────────────────────────────────────────

create table if not exists public.team_role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.team_roles(id) on delete cascade,
  permission text not null,
  created_at timestamptz not null default now(),
  unique (role_id, permission)
);

alter table public.team_role_permissions enable row level security;

drop policy if exists "team members can read role permissions" on public.team_role_permissions;
create policy "team members can read role permissions"
  on public.team_role_permissions for select
  using (
    exists (
      select 1 from public.team_roles r
      where r.id = team_role_permissions.role_id
        and exists (
          select 1 from public.team_members
          where team_id = r.team_id
            and user_id = auth.uid()
        )
    )
  );

create index if not exists idx_team_role_permissions_role_id
  on public.team_role_permissions(role_id);

grant select on public.team_role_permissions to authenticated;
grant all on public.team_role_permissions to service_role;

-- ── Table: team_member_roles ─────────────────────────────────────────────────

create table if not exists public.team_member_roles (
  team_id uuid not null references public.teams(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.team_roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, role_id)
);

alter table public.team_member_roles enable row level security;

drop policy if exists "team members can read member roles" on public.team_member_roles;
create policy "team members can read member roles"
  on public.team_member_roles for select
  using (
    exists (
      select 1 from public.team_members
      where team_id = team_member_roles.team_id
        and user_id = auth.uid()
    )
  );

create index if not exists idx_team_member_roles_member_id
  on public.team_member_roles(member_id);
create index if not exists idx_team_member_roles_team_id
  on public.team_member_roles(team_id);
create index if not exists idx_team_member_roles_role_id
  on public.team_member_roles(role_id);

grant select on public.team_member_roles to authenticated;
grant all on public.team_member_roles to service_role;

-- ── Helper: has_team_permission ──────────────────────────────────────────────
-- The single source of truth for "can this user do X in this team".
--   * Platform admins always have every permission.
--   * The team owner always has every permission (hardcoded).
--   * Everyone else has a permission only if at least one of their assigned
--     roles grants it.
-- Called from SECURITY DEFINER RPCs, RLS policies, and the server action layer.

create or replace function public.has_team_permission(
  p_team_id uuid,
  p_permission text,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1 from public.team_members
      where team_id = p_team_id
        and user_id = p_user_id
        and role = 'owner'
    )
    or exists (
      select 1
      from public.team_member_roles tmr
      join public.team_role_permissions trp on trp.role_id = tmr.role_id
      where tmr.team_id = p_team_id
        and tmr.member_id = p_user_id
        and trp.permission = p_permission
    );
$$;

grant execute on function public.has_team_permission(uuid, text, uuid)
  to anon, authenticated, service_role;

-- ── RPC: get_team_roles ──────────────────────────────────────────────────────
-- Roles for a team with their permissions aggregated and a member count.
-- Only team members (or platform admins) may read them.

create or replace function public.get_team_roles(p_team_id uuid)
returns table (
  id uuid,
  team_id uuid,
  name text,
  color text,
  permissions text[],
  member_count integer,
  created_at timestamptz,
  updated_at timestamptz
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
    raise exception 'Only team members can view team roles';
  end if;

  return query
  select
    r.id,
    r.team_id,
    r.name,
    r.color,
    coalesce(
      array_agg(trp.permission order by trp.permission)
        filter (where trp.permission is not null),
      '{}'::text[]
    ) as permissions,
    (select count(*)::integer
     from public.team_member_roles tmr
     where tmr.role_id = r.id) as member_count,
    r.created_at,
    r.updated_at
  from public.team_roles r
  left join public.team_role_permissions trp on trp.role_id = r.id
  where r.team_id = p_team_id
  group by r.id
  order by r.created_at asc, r.name asc;
end;
$$;

grant execute on function public.get_team_roles(uuid) to authenticated, service_role;

-- ── RPC: get_team_member_roles ───────────────────────────────────────────────
-- Every member of a team with the ids + names of their assigned roles.

create or replace function public.get_team_member_roles(p_team_id uuid)
returns table (
  member_id uuid,
  username text,
  full_name text,
  avatar_url text,
  role_ids uuid[],
  role_names text[]
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
    raise exception 'Only team members can view member roles';
  end if;

  return query
  select
    m.member_id,
    p.username,
    p.full_name,
    p.avatar_url,
    coalesce(array_agg(m.role_id order by m.role_id)
      filter (where m.role_id is not null), '{}'::uuid[]) as role_ids,
    coalesce(array_agg(r.name order by r.name)
      filter (where r.name is not null), '{}'::text[]) as role_names
  from public.team_member_roles m
  join public.profiles p on p.id = m.member_id
  left join public.team_roles r on r.id = m.role_id
  where m.team_id = p_team_id
  group by m.member_id, p.username, p.full_name, p.avatar_url
  order by p.full_name asc;
end;
$$;

grant execute on function public.get_team_member_roles(uuid) to authenticated, service_role;

-- ── RPC: create_team_role ────────────────────────────────────────────────────
-- Owner-only (or platform admin). Roles start empty (no permissions).

create or replace function public.create_team_role(
  p_team_id uuid,
  p_name text,
  p_color text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_role_id uuid;
begin
  if not (public.is_platform_admin() or public.is_team_owner(p_team_id)) then
    raise exception 'Only the team owner can create roles';
  end if;

  if p_name is null or trim(p_name) = '' then
    raise exception 'Role name is required';
  end if;

  insert into public.team_roles (team_id, name, color)
  values (p_team_id, trim(p_name), p_color)
  returning id into v_role_id;

  return v_role_id;
end;
$$;

grant execute on function public.create_team_role(uuid, text, text) to authenticated, service_role;

-- ── RPC: update_team_role ────────────────────────────────────────────────────
-- Owner-only: rename a role and/or change its color.

create or replace function public.update_team_role(
  p_role_id uuid,
  p_name text default null,
  p_color text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_team_id uuid;
begin
  select team_id into v_team_id
  from public.team_roles where id = p_role_id;

  if v_team_id is null then
    raise exception 'Role not found';
  end if;

  if not (public.is_platform_admin() or public.is_team_owner(v_team_id)) then
    raise exception 'Only the team owner can edit roles';
  end if;

  if p_name is not null and trim(p_name) = '' then
    raise exception 'Role name cannot be empty';
  end if;

  update public.team_roles set
    name       = coalesce(trim(p_name), name),
    color      = coalesce(p_color, color),
    updated_at = now()
  where id = p_role_id;
end;
$$;

grant execute on function public.update_team_role(uuid, text, text) to authenticated, service_role;

-- ── RPC: delete_team_role ────────────────────────────────────────────────────
-- Owner-only. Prevents deleting the team's last role so every team always has
-- at least one role (the default "Member" role). Cascades to permissions and
-- member assignments.

create or replace function public.delete_team_role(p_role_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_team_id uuid;
  v_role_count integer;
begin
  select team_id into v_team_id
  from public.team_roles where id = p_role_id;

  if v_team_id is null then
    raise exception 'Role not found';
  end if;

  if not (public.is_platform_admin() or public.is_team_owner(v_team_id)) then
    raise exception 'Only the team owner can delete roles';
  end if;

  select count(*) into v_role_count
  from public.team_roles where team_id = v_team_id;

  if v_role_count <= 1 then
    raise exception 'Cannot delete the last role of the team';
  end if;

  delete from public.team_roles where id = p_role_id;
end;
$$;

grant execute on function public.delete_team_role(uuid) to authenticated, service_role;

-- ── RPC: set_role_permissions ────────────────────────────────────────────────
-- Owner-only. Replaces the full permission set of a role. Every permission is
-- validated against the catalog to prevent typos and unknown strings.

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
    'EDIT_TEAM_INFORMATION', 'EDIT_TEAM_APPEARANCE'
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

-- ── RPC: assign_member_roles ─────────────────────────────────────────────────
-- Owner-only. Replaces the role set of a single member. The owner can never be
-- assigned roles (the owner always has every permission). Passing an empty /
-- null array removes all roles from the member.

create or replace function public.assign_member_roles(
  p_team_id uuid,
  p_member_id uuid,
  p_role_ids uuid[]
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_target_role text;
begin
  if not (public.is_platform_admin() or public.is_team_owner(p_team_id)) then
    raise exception 'Only the team owner can assign roles';
  end if;

  select role into v_target_role
  from public.team_members
  where team_id = p_team_id and user_id = p_member_id;

  if v_target_role is null then
    raise exception 'User is not a member of this team';
  end if;

  if v_target_role = 'owner' then
    raise exception 'Cannot assign roles to the team owner';
  end if;

  if exists (
    select 1 from public.team_roles
    where id = any(p_role_ids) and team_id <> p_team_id
  ) then
    raise exception 'One or more roles do not belong to this team';
  end if;

  delete from public.team_member_roles
  where team_id = p_team_id and member_id = p_member_id;

  if p_role_ids is not null and cardinality(p_role_ids) > 0 then
    insert into public.team_member_roles (team_id, member_id, role_id)
    select distinct p_team_id, p_member_id, unnest(p_role_ids);
  end if;
end;
$$;

grant execute on function public.assign_member_roles(uuid, uuid, uuid[]) to authenticated, service_role;

-- ── Gate updates ─────────────────────────────────────────────────────────────
-- Every existing "owner only" / "owner or admin" gate becomes a permission
-- check. Owner + platform admin keep everything via has_team_permission.

-- review_team_join_request → REVIEW_JOIN_REQUESTS
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

  if not public.has_team_permission(v_team_id, 'REVIEW_JOIN_REQUESTS') then
    raise exception 'You do not have permission to review join requests';
  end if;

  select name, slug into v_team_name, v_team_slug
  from public.teams where id = v_team_id;

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

-- invite_team_member → INVITE_MEMBERS
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
  if not public.has_team_permission(p_team_id, 'INVITE_MEMBERS') then
    raise exception 'You do not have permission to invite members';
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

-- get_team_join_requests → viewers need REVIEW_JOIN_REQUESTS
create or replace function public.get_team_join_requests(p_team_id uuid)
returns table (
  id uuid,
  team_id uuid,
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  institution text,
  message text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  if not public.has_team_permission(p_team_id, 'REVIEW_JOIN_REQUESTS') then
    raise exception 'You do not have permission to view join requests';
  end if;

  return query
  select
    r.id,
    r.team_id,
    r.user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.institution,
    r.message,
    r.status,
    r.created_at
  from public.team_join_requests r
  join public.profiles p on p.id = r.user_id
  where r.team_id = p_team_id
  order by case when r.status = 'PENDING' then 0 else 1 end, r.created_at asc;
end;
$$;

grant execute on function public.get_team_join_requests(uuid) to authenticated, service_role;

-- RLS: join requests / invitations become visible to permission holders
drop policy if exists "team leaders can view join requests for their teams"
  on public.team_join_requests;
drop policy if exists "join request reviewers can view requests for their teams"
  on public.team_join_requests;
create policy "join request reviewers can view requests for their teams"
  on public.team_join_requests for select
  using (
    public.has_team_permission(team_id, 'REVIEW_JOIN_REQUESTS')
  );

drop policy if exists "team leaders can view invitations for their teams"
  on public.team_invitations;
drop policy if exists "inviters can view invitations for their teams"
  on public.team_invitations;
create policy "inviters can view invitations for their teams"
  on public.team_invitations for select
  using (
    public.has_team_permission(team_id, 'INVITE_MEMBERS')
  );

-- ── RPC: get_team_invitations ────────────────────────────────────────────────
-- Every invitation sent to/for a team (for the team settings Invitations tab).
-- Only members with INVITE_MEMBERS (or platform admins) may view them.

create or replace function public.get_team_invitations(p_team_id uuid)
returns table (
  id uuid,
  team_id uuid,
  invited_user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  invited_by_username text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  if not public.has_team_permission(p_team_id, 'INVITE_MEMBERS') then
    raise exception 'You do not have permission to view invitations';
  end if;

  return query
  select
    i.id,
    i.team_id,
    i.invited_user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    inv.username,
    i.status,
    i.created_at
  from public.team_invitations i
  join public.profiles p on p.id = i.invited_user_id
  left join public.profiles inv on inv.id = i.invited_by
  where i.team_id = p_team_id
  order by i.created_at desc;
end;
$$;

grant execute on function public.get_team_invitations(uuid) to authenticated, service_role;

-- remove_member → REMOVE_MEMBERS (owner can never be removed)
create or replace function public.remove_member(
  p_team_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_target_role text;
begin
  if not public.has_team_permission(p_team_id, 'REMOVE_MEMBERS') then
    raise exception 'You do not have permission to remove members';
  end if;

  select role into v_target_role
  from public.team_members
  where team_id = p_team_id and user_id = p_user_id;

  if v_target_role is null then
    raise exception 'User is not a member of this team';
  end if;

  if v_target_role = 'owner' then
    raise exception 'Cannot remove the team owner';
  end if;

  delete from public.team_members
  where team_id = p_team_id and user_id = p_user_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'removed_member',
    jsonb_build_object(
      'team_id', p_team_id,
      'removed_user_id', p_user_id
    )
  );
end;
$$;

grant execute on function public.remove_member(uuid, uuid) to authenticated, service_role;

-- create_project → CREATE_PROJECTS
create or replace function public.create_project(
  p_team_id uuid,
  p_name text,
  p_slug text,
  p_description text default null,
  p_visibility text default 'open',
  p_logo_url text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
begin
  if not public.has_team_permission(p_team_id, 'CREATE_PROJECTS') then
    raise exception 'You do not have permission to create projects in this team';
  end if;

  insert into public.projects (
    team_id, owner_id, name, slug, description, visibility, logo_url
  ) values (
    p_team_id, auth.uid(), p_name, p_slug, p_description, p_visibility, p_logo_url
  )
  returning id into v_project_id;

  insert into public.project_members (project_id, user_id, role)
  values (v_project_id, auth.uid(), 'owner');

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'created_project',
    jsonb_build_object(
      'project_id', v_project_id,
      'project_name', p_name,
      'project_slug', p_slug,
      'team_id', p_team_id
    )
  );

  return v_project_id;
end;
$$;

grant execute on function public.create_project(uuid, text, text, text, text, text)
  to authenticated, service_role;

-- Live sessions: hosts the user may create sessions for + permission checks
create or replace function public.can_manage_live_session_host(
  p_host_type text,
  p_host_id uuid
)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    public.is_platform_admin()
    or (
      p_host_type = 'BRANCH'
      and public.is_branch_leader(p_host_id)
    )
    or (
      p_host_type = 'TEAM'
      and (public.has_team_permission(p_host_id, 'CREATE_LIVE_SESSIONS')
           or public.has_team_permission(p_host_id, 'MANAGE_LIVE_SESSIONS'))
    );
$$;

grant execute on function public.can_manage_live_session_host(text, uuid) to anon, authenticated, service_role;

create or replace function public.can_manage_live_session(p_session_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    public.is_platform_admin()
    or (
      ls.host_type = 'BRANCH'
      and public.is_branch_leader(ls.host_id)
    )
    or (
      ls.host_type = 'TEAM'
      and public.has_team_permission(ls.host_id, 'MANAGE_LIVE_SESSIONS')
    )
  from public.live_sessions ls
  where ls.id = p_session_id;
$$;

grant execute on function public.can_manage_live_session(uuid) to anon, authenticated, service_role;

create or replace function public.get_manageable_session_hosts()
returns table (host_type text, host_id uuid, host_name text)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  if public.is_platform_admin() then
    return query
      select 'BRANCH'::text, b.id, b.name from public.branches b
      union all
      select 'TEAM'::text, t.id, t.name from public.teams t
      order by 3;
    return;
  end if;

  return query
    select 'BRANCH'::text, b.id, b.name
    from public.branch_leaders bl
    join public.branches b on b.id = bl.branch_id
    where bl.user_id = auth.uid()
    union all
    select 'TEAM'::text, t.id, t.name
    from public.teams t
    where public.has_team_permission(t.id, 'CREATE_LIVE_SESSIONS')
       or public.has_team_permission(t.id, 'MANAGE_LIVE_SESSIONS')
    order by 3;
end;
$$;

grant execute on function public.get_manageable_session_hosts() to authenticated, service_role;

-- Team updates / feed: create → CREATE_FEED_POSTS, edit/delete own posts always
-- allowed, and EDIT_FEED_POSTS / DELETE_FEED_POSTS cover everyone else's posts.
drop policy if exists "members can create team updates" on public.team_updates;
drop policy if exists "feed posters can create team updates" on public.team_updates;
create policy "feed posters can create team updates"
  on public.team_updates for insert
  with check (
    public.has_team_permission(team_id, 'CREATE_FEED_POSTS')
  );

drop policy if exists "authors can update their own team updates" on public.team_updates;
drop policy if exists "authors or feed editors can update team updates" on public.team_updates;
create policy "authors or feed editors can update team updates"
  on public.team_updates for update
  using (
    author_id = auth.uid()
    or public.has_team_permission(team_id, 'EDIT_FEED_POSTS')
  );

drop policy if exists "authors can delete their own team updates" on public.team_updates;
drop policy if exists "authors or feed editors can delete team updates" on public.team_updates;
create policy "authors or feed editors can delete team updates"
  on public.team_updates for delete
  using (
    author_id = auth.uid()
    or public.has_team_permission(team_id, 'DELETE_FEED_POSTS')
  );

-- Storage: feed posters can upload team update images
drop policy if exists "team members can upload update images" on storage.objects;
drop policy if exists "feed posters can upload update images" on storage.objects;
create policy "feed posters can upload update images"
  on storage.objects for insert with check (
    bucket_id = 'team-updates'
    and public.has_team_permission(
      (storage.foldername(name))[1]::uuid,
      'CREATE_FEED_POSTS'
    )
  );

-- Team settings: split update_team into information + appearance so the two
-- permissions are enforced independently. update_team is kept for backward
-- compatibility during the UI migration and allows either permission.
create or replace function public.update_team_information(
  p_team_id uuid,
  p_name text default null,
  p_slug text default null,
  p_description text default null,
  p_visibility text default null,
  p_technologies text[] default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.has_team_permission(p_team_id, 'EDIT_TEAM_INFORMATION') then
    raise exception 'You do not have permission to edit team information';
  end if;

  update public.teams set
    name         = coalesce(p_name, name),
    slug         = coalesce(p_slug, slug),
    description  = coalesce(p_description, description),
    visibility   = coalesce(p_visibility, visibility),
    technologies = coalesce(p_technologies, technologies),
    updated_at   = now()
  where id = p_team_id;
end;
$$;

grant execute on function public.update_team_information(uuid, text, text, text, text, text[])
  to authenticated, service_role;

create or replace function public.update_team_appearance(
  p_team_id uuid,
  p_logo_url text default null,
  p_banner_url text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.has_team_permission(p_team_id, 'EDIT_TEAM_APPEARANCE') then
    raise exception 'You do not have permission to edit team appearance';
  end if;

  update public.teams set
    logo_url   = coalesce(p_logo_url, logo_url),
    banner_url = coalesce(p_banner_url, banner_url),
    updated_at = now()
  where id = p_team_id;
end;
$$;

grant execute on function public.update_team_appearance(uuid, text, text) to authenticated, service_role;

create or replace function public.update_team(
  p_team_id uuid,
  p_name text default null,
  p_slug text default null,
  p_description text default null,
  p_visibility text default null,
  p_logo_url text default null,
  p_banner_url text default null,
  p_category_id uuid default null,
  p_technologies text[] default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not (public.has_team_permission(p_team_id, 'EDIT_TEAM_INFORMATION')
       or public.has_team_permission(p_team_id, 'EDIT_TEAM_APPEARANCE')) then
    raise exception 'You do not have permission to edit team settings';
  end if;

  update public.teams set
    name         = coalesce(p_name, name),
    slug         = coalesce(p_slug, slug),
    description  = coalesce(p_description, description),
    visibility   = coalesce(p_visibility, visibility),
    logo_url     = coalesce(p_logo_url, logo_url),
    banner_url   = coalesce(p_banner_url, banner_url),
    technologies = coalesce(p_technologies, technologies),
    updated_at   = now()
  where id = p_team_id;
end;
$$;

grant execute on function public.update_team(uuid, text, text, text, text, text, text, uuid, text[])
  to authenticated, service_role;

-- ── Harden legacy role management ─────────────────────────────────────────────
-- update_member_role is being superseded by role assignments (assign_member_roles)
-- but stays functional for the legacy owner/admin/member field. Block promoting
-- someone to owner directly, which the action layer previously only prevented.

create or replace function public.update_member_role(
  p_team_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_caller_role text;
  v_target_role text;
begin
  if p_role = 'owner' then
    raise exception 'Cannot assign the owner role directly. Transfer ownership instead.';
  end if;

  select role into v_caller_role
  from public.team_members
  where team_id = p_team_id and user_id = auth.uid();

  if v_caller_role is null then
    raise exception 'Not a member of this team';
  end if;

  if v_caller_role <> 'owner' and v_caller_role <> 'admin' then
    raise exception 'Only the team owner or an admin can update member roles';
  end if;

  select role into v_target_role
  from public.team_members
  where team_id = p_team_id and user_id = p_user_id;

  if v_target_role is null then
    raise exception 'User is not a member of this team';
  end if;

  if v_target_role = 'owner' then
    raise exception 'Cannot change the owner role';
  end if;

  if p_role = 'admin' and v_caller_role <> 'owner' then
    raise exception 'Only the owner can promote members to admin';
  end if;

  if v_target_role = 'admin' and v_caller_role <> 'owner' then
    raise exception 'Only the owner can demote admins';
  end if;

  update public.team_members
  set role = p_role
  where team_id = p_team_id and user_id = p_user_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'updated_member_role',
    jsonb_build_object(
      'team_id', p_team_id,
      'target_user_id', p_user_id,
      'new_role', p_role
    )
  );
end;
$$;

grant execute on function public.update_member_role(uuid, uuid, text) to authenticated, service_role;

-- ── Default "Member" role on team creation ───────────────────────────────────
-- Recreates create_team so every new team starts with a permissionless
-- "Member" role, then backfills existing teams that have no roles yet.

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
begin
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

-- Backfill: ensure every existing team has at least the default Member role
insert into public.team_roles (team_id, name, color)
select t.id, 'Member', null
from public.teams t
where not exists (
  select 1 from public.team_roles r where r.team_id = t.id
);
