-- Migration: 00093_core_team_member_role
--
-- Adds a platform-level "core_team_member" role and grants it to the current
-- Azenion core team.
--
-- The app has no global roles catalog (team roles are per-team in
-- `team_roles`, and platform admins live in `platform_admins`), so this
-- creates the equivalent role table:
--   * public.roles      — global platform role catalog
--   * public.user_roles — which profile holds which platform role
--
-- The role is a marker only for now: no RPC or RLS gate depends on it yet.

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

-- ── Seed the role ────────────────────────────────────────────────────────────

insert into public.roles (name, description)
values ('core_team_member', 'Member of the Azenion core team')
on conflict (name) do nothing;

-- ── Grant to the current core team ───────────────────────────────────────────
-- Matches each member by first name in their profile's full_name or username.
-- Exactly ONE profile must match per name:
--   * no match      -> notice (name did not resolve; migration still completes)
--   * multiple      -> exception, aborts the whole migration so a duplicate
--                      (e.g. a test "ziyad" profile next to the real Ziyad)
--                      is never silently granted
-- Because the exception rolls back every grant, fix the duplicate first and
-- re-run the migration to get the full, unambiguous set.

do $$
declare
  v_role_id uuid;
  v_count integer;
  v_member text;
  v_members text[] := array['ziyad', 'yasser', 'mayssae', 'ayoub', 'adil', 'meriem'];
begin
  select id into v_role_id
  from public.roles
  where name = 'core_team_member';

  if v_role_id is null then
    raise exception 'core_team_member role was not created';
  end if;

  foreach v_member in array v_members loop
    select count(*) into v_count
    from public.profiles p
    where lower(btrim(p.full_name)) like '%' || v_member || '%'
       or lower(btrim(p.username))  like '%' || v_member || '%';

    if v_count = 0 then
      raise notice 'no profile matched "%" — skipped', v_member;
    elsif v_count > 1 then
      raise exception 'multiple profiles match "%" (% profiles); refusing to grant — remove duplicates and re-run', v_member, v_count;
    else
      insert into public.user_roles (user_id, role_id)
      select p.id, v_role_id
      from public.profiles p
      where lower(btrim(p.full_name)) like '%' || v_member || '%'
         or lower(btrim(p.username))  like '%' || v_member || '%'
      on conflict (user_id, role_id) do nothing;

      raise notice 'core_team_member granted to "%" -> 1 profile(s)', v_member;
    end if;
  end loop;
end;
$$;

-- ── Verify ───────────────────────────────────────────────────────────────────
-- select p.username, p.full_name, r.name
-- from public.user_roles ur
-- join public.profiles p on p.id = ur.user_id
-- join public.roles r on r.id = ur.role_id
-- order by p.full_name;