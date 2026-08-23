-- Migration: 00093_platform_roles
--
-- Adds a global platform role catalog (`core_team_member`, `creator`) and the
-- profile→role assignments table, plus SECURITY DEFINER admin-gated RPCs to
-- grant/revoke roles.
--
-- The app has no global roles catalog (team roles are per-team in
-- `team_roles`, and platform admins live in `platform_admins`), so this
-- creates the equivalent role table:
--   * public.roles      — global platform role catalog
--   * public.user_roles — which profile holds which platform role
--
-- Role assignments are ONLY ever managed through `admin_grant_role` /
-- `admin_revoke_role`, both gated on `is_platform_admin()` (00028). There is
-- deliberately NO signup trigger and NO name/LIKE-based auto-grant: privileges
-- are granted by an administrator explicitly, never inferred from a username.
--
-- Initial role assignment is intentionally NOT performed here. It is an
-- explicit, controlled step done by an administrator via admin_grant_role once
-- this migration is applied.

-- ── Table: public.roles ──────────────────────────────────────────────────────

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

alter table public.roles enable row level security;

drop policy if exists "roles are publicly readable" on public.roles;
create policy "roles are publicly readable"
  on public.roles for select using (true);

grant select on public.roles to anon, authenticated;
grant all on public.roles to service_role;

-- ── Table: public.user_roles ─────────────────────────────────────────────────

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

alter table public.user_roles enable row level security;

drop policy if exists "user roles are publicly readable" on public.user_roles;
create policy "user roles are publicly readable"
  on public.user_roles for select using (true);

create index if not exists idx_user_roles_role_id on public.user_roles(role_id);

grant select on public.user_roles to anon, authenticated;
grant all on public.user_roles to service_role;

-- ── Seed the role catalog ────────────────────────────────────────────────────

insert into public.roles (name, description)
values
  ('core_team_member', 'Member of the Azenion core team'),
  ('creator', 'Course creator who can manage Academy courses')
on conflict (name) do nothing;

-- ── RPC: admin_grant_role ────────────────────────────────────────────────────
-- Grants a platform role to a profile. Only platform administrators may call
-- this. No name matching, no auto-grants — an admin explicitly assigns every
-- role.

create or replace function public.admin_grant_role(
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
    raise exception 'Only the platform administrator can grant roles';
  end if;

  select id into v_role_id
  from public.roles
  where name = p_role_name;

  if v_role_id is null then
    raise exception 'Unknown role: %', p_role_name;
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Profile not found';
  end if;

  insert into public.user_roles (user_id, role_id)
  values (p_user_id, v_role_id)
  on conflict (user_id, role_id) do nothing;
end;
$$;

-- ── RPC: admin_revoke_role ───────────────────────────────────────────────────
-- Removes a platform role from a profile. Only platform administrators may
-- call this.

create or replace function public.admin_revoke_role(
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
    raise exception 'Only the platform administrator can revoke roles';
  end if;

  select id into v_role_id
  from public.roles
  where name = p_role_name;

  if v_role_id is null then
    raise exception 'Unknown role: %', p_role_name;
  end if;

  delete from public.user_roles
  where user_id = p_user_id and role_id = v_role_id;
end;
$$;

grant execute on function public.admin_grant_role(uuid, text)
  to anon, authenticated, service_role;
grant execute on function public.admin_revoke_role(uuid, text)
  to anon, authenticated, service_role;

comment on function public.admin_grant_role(uuid, text) is
  'Admin-only: grants a platform role to a profile. Rejects unless the caller '
  'is a platform administrator. No automatic or name-based grants exist.';
comment on function public.admin_revoke_role(uuid, text) is
  'Admin-only: revokes a platform role from a profile. Rejects unless the '
  'caller is a platform administrator.';