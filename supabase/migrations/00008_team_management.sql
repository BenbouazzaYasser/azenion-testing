-- Migration: 00008_team_management
--
-- Adds team categories, open roles, and management RPCs.

-- ── Team Categories ─────────────────────────────────────────────────────────

create table if not exists public.team_categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null
);

alter table public.team_categories enable row level security;

create policy "team categories are publicly readable"
  on public.team_categories for select
  using (true);

grant select on public.team_categories to anon, authenticated, service_role;

insert into public.team_categories (name, slug) values
  ('Technology', 'technology'),
  ('AI', 'ai'),
  ('Cybersecurity', 'cybersecurity'),
  ('Design', 'design'),
  ('Business', 'business'),
  ('Entrepreneurship', 'entrepreneurship'),
  ('Robotics', 'robotics'),
  ('Game Development', 'game-development'),
  ('Research', 'research'),
  ('Open Source', 'open-source'),
  ('Other', 'other')
on conflict (slug) do nothing;

alter table public.teams
  add column if not exists category_id uuid references public.team_categories(id);

-- ── Team Open Roles ─────────────────────────────────────────────────────────

create table if not exists public.team_open_roles (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  description text,
  quantity int not null default 1 check (quantity > 0),
  created_at timestamptz default now()
);

alter table public.team_open_roles enable row level security;

create policy "open roles are publicly readable"
  on public.team_open_roles for select
  using (true);

create policy "owner and admin can manage open roles"
  on public.team_open_roles for insert
  with check (
    exists (
      select 1 from public.team_members
      where team_members.team_id = team_open_roles.team_id
        and team_members.user_id = auth.uid()
        and team_members.role in ('owner', 'admin')
    )
  );

create policy "owner and admin can update open roles"
  on public.team_open_roles for update
  using (
    exists (
      select 1 from public.team_members
      where team_members.team_id = team_open_roles.team_id
        and team_members.user_id = auth.uid()
        and team_members.role in ('owner', 'admin')
    )
  );

create policy "owner and admin can delete open roles"
  on public.team_open_roles for delete
  using (
    exists (
      select 1 from public.team_members
      where team_members.team_id = team_open_roles.team_id
        and team_members.user_id = auth.uid()
        and team_members.role in ('owner', 'admin')
    )
  );

grant select, insert, update, delete on public.team_open_roles to anon, authenticated, service_role;

-- ── RPC: update_team ────────────────────────────────────────────────────────

create or replace function public.update_team(
  p_team_id uuid,
  p_name text default null,
  p_slug text default null,
  p_description text default null,
  p_visibility text default null,
  p_logo_url text default null,
  p_banner_url text default null,
  p_category_id uuid default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_role text;
begin
  select role into v_user_role
  from public.team_members
  where team_id = p_team_id and user_id = auth.uid();

  if v_user_role is null or v_user_role not in ('owner', 'admin') then
    raise exception 'Only the team owner or an admin can update team settings';
  end if;

  update public.teams set
    name        = coalesce(p_name, name),
    slug        = coalesce(p_slug, slug),
    description = coalesce(p_description, description),
    visibility  = coalesce(p_visibility, visibility),
    logo_url    = coalesce(p_logo_url, logo_url),
    banner_url  = coalesce(p_banner_url, banner_url),
    category_id = coalesce(p_category_id, category_id),
    updated_at  = now()
  where id = p_team_id;
end;
$$;

-- ── RPC: delete_team ────────────────────────────────────────────────────────

create or replace function public.delete_team(p_team_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner_id uuid;
  v_team_name text;
  v_team_slug text;
begin
  select owner_id, name, slug into v_owner_id, v_team_name, v_team_slug
  from public.teams
  where id = p_team_id;

  if v_owner_id is null then
    raise exception 'Team not found';
  end if;

  if v_owner_id <> auth.uid() then
    raise exception 'Only the team owner can delete the team';
  end if;

  delete from public.team_members where team_id = p_team_id;
  delete from public.team_open_roles where team_id = p_team_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'deleted_team',
    jsonb_build_object('team_id', p_team_id, 'team_name', v_team_name)
  );

  delete from public.teams where id = p_team_id;
end;
$$;

-- ── RPC: update_member_role ─────────────────────────────────────────────────

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
  select role into v_caller_role
  from public.team_members
  where team_id = p_team_id and user_id = auth.uid();

  if v_caller_role is null then
    raise exception 'Not a member of this team';
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

-- ── RPC: remove_member ──────────────────────────────────────────────────────

create or replace function public.remove_member(
  p_team_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_caller_role text;
  v_target_role text;
begin
  select role into v_caller_role
  from public.team_members
  where team_id = p_team_id and user_id = auth.uid();

  if v_caller_role is null then
    raise exception 'Not a member of this team';
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

  if v_caller_role = 'admin' and v_target_role <> 'member' then
    raise exception 'Admins can only remove members';
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
