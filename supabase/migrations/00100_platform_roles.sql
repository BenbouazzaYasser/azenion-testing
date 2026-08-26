-- Migration: 00100_platform_roles
--
-- Platform-level roles system for cross-product authorization.
-- Replaces ad-hoc checks with a proper RBAC foundation.

-- ── Table: roles ──────────────────────────────────────────────────────────────
-- Canonical list of platform roles. Managed by platform admins only.

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.roles enable row level security;

create policy "roles are publicly readable"
  on public.roles for select using (true);

-- System roles are managed via migration only; no direct write policies.
-- Platform admins manage assignments via user_roles RPCs below.

-- ── Table: user_roles ─────────────────────────────────────────────────────────
-- Many-to-many: which users hold which platform roles.
-- Only platform admins can assign/revoke.

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

alter table public.user_roles enable row level security;

create policy "user roles are publicly readable"
  on public.user_roles for select using (true);

create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_role_id on public.user_roles(role_id);

-- ── RPC: has_platform_role ────────────────────────────────────────────────────
-- Single source of truth: does a user hold a platform role?
-- Platform admins implicitly hold every role (via is_platform_admin).

create or replace function public.has_platform_role(
  p_role_name text,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    public.is_platform_admin(p_user_id)
    or exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = p_user_id
        and r.name = p_role_name
    );
$$;

grant execute on function public.has_platform_role(text, uuid)
  to anon, authenticated, service_role;

-- ── RPC: get_user_platform_roles ──────────────────────────────────────────────
-- Returns all platform roles for a user (for admin UI).

create or replace function public.get_user_platform_roles(p_user_id uuid)
returns table (
  role_id uuid,
  name text,
  description text,
  is_system boolean,
  assigned_at timestamptz
)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only platform admins can view user platform roles';
  end if;

  return query
  select
    r.id,
    r.name,
    r.description,
    r.is_system,
    ur.assigned_at
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = p_user_id
  order by r.name;
end;
$$;

grant execute on function public.get_user_platform_roles(uuid)
  to authenticated, service_role;

-- ── RPC: grant_platform_role ──────────────────────────────────────────────────
-- Platform admin only: assign a platform role to a user.

create or replace function public.grant_platform_role(
  p_user_id uuid,
  p_role_name text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_role_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Only platform admins can grant platform roles';
  end if;

  select id into v_role_id
  from public.roles
  where name = p_role_name;

  if v_role_id is null then
    raise exception 'Role not found: %', p_role_name;
  end if;

  insert into public.user_roles (user_id, role_id, assigned_by)
  values (p_user_id, v_role_id, auth.uid())
  on conflict (user_id, role_id) do nothing;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'granted_platform_role',
    jsonb_build_object('target_user_id', p_user_id, 'role_name', p_role_name)
  );
end;
$$;

grant execute on function public.grant_platform_role(uuid, text)
  to authenticated, service_role;

-- ── RPC: revoke_platform_role ─────────────────────────────────────────────────
-- Platform admin only: remove a platform role from a user.

create or replace function public.revoke_platform_role(
  p_user_id uuid,
  p_role_name text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_role_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Only platform admins can revoke platform roles';
  end if;

  select id into v_role_id
  from public.roles
  where name = p_role_name;

  if v_role_id is null then
    raise exception 'Role not found: %', p_role_name;
  end if;

  delete from public.user_roles
  where user_id = p_user_id and role_id = v_role_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'revoked_platform_role',
    jsonb_build_object('target_user_id', p_user_id, 'role_name', p_role_name)
  );
end;
$$;

grant execute on function public.revoke_platform_role(uuid, text)
  to authenticated, service_role;

-- ── Seed system roles ─────────────────────────────────────────────────────────
-- These are the canonical platform roles. is_system = true means they cannot
-- be deleted via UI (only via migration).

insert into public.roles (name, description, is_system) values
  ('platform_admin', 'Full platform administrator with unrestricted access', true),
  ('core_team_member', 'Core team member - can manage academy courses and platform-wide content', true),
  ('creator', 'Verified content creator - can publish courses and labs', true),
  ('instructor', 'Verified instructor - can host live sessions and create educational content', true),
  ('moderator', 'Community moderator - can moderate content and users', true)
on conflict (name) do update set
  description = excluded.description,
  is_system = excluded.is_system;

-- ── Grants ────────────────────────────────────────────────────────────────────

grant select on public.roles to anon, authenticated, service_role;
grant select, insert, update, delete on public.user_roles to service_role;
grant select on public.user_roles to anon, authenticated;