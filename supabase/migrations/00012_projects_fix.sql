-- Migration: 00012_projects_fix
--
-- Replaces the projects/project_members/project_positions tables with the
-- correct schema matching the spec:
--   visibility: open | private | invite_only
--   roles:      owner | admin | member
--   bucket:     project-logos (replaces project-assets)
--
-- Drops the 00011 schema first, then recreates cleanly.

-- ── Drop old 00011 schema ──────────────────────────────────────────────────

drop function if exists public.create_project;
drop function if exists public.join_project;
drop function if exists public.leave_project;
drop function if exists public.update_project;
drop function if exists public.delete_project;

drop table if exists public.project_positions cascade;
drop table if exists public.project_members cascade;
drop table if exists public.projects cascade;

-- ── Projects table ─────────────────────────────────────────────────────────

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text unique not null,
  name text not null,
  description text,
  visibility text not null default 'open'
    check (visibility in ('open', 'private', 'invite_only')),
  logo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.projects enable row level security;

-- ── Project members table ──────────────────────────────────────────────────

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now(),
  primary key (project_id, user_id)
);

alter table public.project_members enable row level security;

-- ── Indexes ────────────────────────────────────────────────────────────────

create index if not exists idx_projects_team_id on public.projects(team_id);
create index if not exists idx_projects_slug on public.projects(slug);
create index if not exists idx_project_members_project_id
  on public.project_members(project_id);
create index if not exists idx_project_members_user_id
  on public.project_members(user_id);

-- ── Table-level privileges ────────────────────────────────────────────────

grant select, insert, update, delete
  on public.projects        to anon, authenticated, service_role;
grant select, insert, update, delete
  on public.project_members to anon, authenticated, service_role;

-- ── RLS: Projects SELECT ──────────────────────────────────────────────────

-- Open projects are readable by everyone
create policy "open projects are readable by everyone"
  on public.projects for select
  using (visibility = 'open');

-- Project owners can read their own projects
create policy "owner can read their projects"
  on public.projects for select
  using (owner_id = auth.uid());

-- Members can read projects they belong to
create policy "members can read their projects"
  on public.projects for select
  using (
    id in (
      select project_id from public.project_members
      where user_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies on projects.
-- All mutations go through SECURITY DEFINER RPCs.

-- ── RLS: Project Members ──────────────────────────────────────────────────

create policy "authenticated users can read project members"
  on public.project_members for select
  using (auth.role() = 'authenticated');

-- No INSERT/UPDATE/DELETE policies on project_members.
-- All mutations go through SECURITY DEFINER RPCs.

-- ── RPC: create_project ────────────────────────────────────────────────────

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
  v_user_role text;
  v_project_id uuid;
begin
  -- Only team owners and admins may create projects
  select role into v_user_role
  from public.team_members
  where team_id = p_team_id and user_id = auth.uid();

  if v_user_role is null or v_user_role not in ('owner', 'admin') then
    raise exception 'Only team owners or admins can create projects';
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

-- ── RPC: join_project ──────────────────────────────────────────────────────

create or replace function public.join_project(p_project_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_name text;
  v_project_slug text;
begin
  if exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = auth.uid()
  ) then
    return;
  end if;

  select name, slug into v_project_name, v_project_slug
  from public.projects
  where id = p_project_id;

  if v_project_name is null then
    raise exception 'Project not found';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (p_project_id, auth.uid(), 'member');

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'joined_project',
    jsonb_build_object(
      'project_id', p_project_id,
      'project_name', v_project_name,
      'project_slug', v_project_slug
    )
  );
end;
$$;

-- ── RPC: leave_project ─────────────────────────────────────────────────────

create or replace function public.leave_project(p_project_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_role text;
  v_owner_count int;
  v_project_name text;
  v_project_slug text;
begin
  select role into v_user_role
  from public.project_members
  where project_id = p_project_id and user_id = auth.uid();

  if v_user_role is null then
    raise exception 'Not a member of this project';
  end if;

  if v_user_role = 'owner' then
    select count(*) into v_owner_count
    from public.project_members
    where project_id = p_project_id and role = 'owner';

    if v_owner_count <= 1 then
      raise exception 'Cannot leave as the only owner. Transfer ownership first.';
    end if;
  end if;

  select name, slug into v_project_name, v_project_slug
  from public.projects
  where id = p_project_id;

  delete from public.project_members
  where project_id = p_project_id and user_id = auth.uid();

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'left_project',
    jsonb_build_object(
      'project_id', p_project_id,
      'project_name', v_project_name,
      'project_slug', v_project_slug
    )
  );
end;
$$;

-- ── Storage: project-logos bucket ──────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('project-logos', 'project-logos', true)
on conflict (id) do nothing;

create policy "project logos are publicly readable"
  on storage.objects for select using (bucket_id = 'project-logos');

create policy "project owners can upload logos"
  on storage.objects for insert with check (
    bucket_id = 'project-logos'
    and exists (
      select 1 from public.project_members
      where project_members.project_id = (storage.foldername(name))[1]::uuid
        and project_members.user_id = auth.uid()
        and project_members.role = 'owner'
    )
  );

create policy "project owners can update logos"
  on storage.objects for update using (
    bucket_id = 'project-logos'
    and exists (
      select 1 from public.project_members
      where project_members.project_id = (storage.foldername(name))[1]::uuid
        and project_members.user_id = auth.uid()
        and project_members.role = 'owner'
    )
  );

create policy "project owners can delete logos"
  on storage.objects for delete using (
    bucket_id = 'project-logos'
    and exists (
      select 1 from public.project_members
      where project_members.project_id = (storage.foldername(name))[1]::uuid
        and project_members.user_id = auth.uid()
        and project_members.role = 'owner'
    )
  );
