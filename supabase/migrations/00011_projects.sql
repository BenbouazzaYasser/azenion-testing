-- Migration: 00011_projects
--
-- Adds project management: projects table, project_members table,
-- project_positions table, SECURITY DEFINER RPCs, storage bucket, and RLS policies.
--
-- Architecture matches teams exactly:
--   - No direct INSERT/UPDATE/DELETE policies on core data tables
--   - All mutations go through SECURITY DEFINER RPCs
--   - RLS for SELECT only (visibility + ownership + membership)
--   - Activities logged inside RPCs (no compound writes from client)
--   - project_positions uses RLS (matches team_open_roles pattern)

-- ── Projects table ───────────────────────────────────────────────────────────

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text unique not null,
  description text,
  status text not null default 'planning'
    check (status in ('planning', 'active', 'paused', 'completed')),
  visibility text not null default 'public'
    check (visibility in ('public', 'private')),
  github_url text,
  website_url text,
  banner_url text,
  logo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.projects enable row level security;

-- ── Project members table ────────────────────────────────────────────────────

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'contributor' check (role in ('owner', 'maintainer', 'contributor')),
  joined_at timestamptz default now(),
  primary key (project_id, user_id)
);

alter table public.project_members enable row level security;

-- ── Project positions table ──────────────────────────────────────────────────

create table if not exists public.project_positions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  filled boolean not null default false,
  created_at timestamptz default now()
);

alter table public.project_positions enable row level security;

-- ── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists idx_projects_team_id on public.projects(team_id);
create index if not exists idx_projects_slug on public.projects(slug);
create index if not exists idx_project_members_project_id
  on public.project_members(project_id);
create index if not exists idx_project_members_user_id
  on public.project_members(user_id);
create index if not exists idx_project_positions_project_id
  on public.project_positions(project_id);

-- ── Table-level privileges ──────────────────────────────────────────────────

grant select, insert, update, delete
  on public.projects       to anon, authenticated, service_role;
grant select, insert, update, delete
  on public.project_members to anon, authenticated, service_role;
grant select, insert, update, delete
  on public.project_positions to anon, authenticated, service_role;

-- ── RLS: Projects SELECT ────────────────────────────────────────────────────

-- Public projects are readable by everyone
create policy "public projects are readable by everyone"
  on public.projects for select
  using (visibility = 'public');

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

-- ── RLS: Project Members ────────────────────────────────────────────────────

create policy "authenticated users can read project members"
  on public.project_members for select
  using (auth.role() = 'authenticated');

-- No INSERT/UPDATE/DELETE policies on project_members.
-- All mutations go through SECURITY DEFINER RPCs.

-- ── RLS: Project Positions ──────────────────────────────────────────────────

-- Anyone can read positions (visible on project pages)
create policy "anyone can read project positions"
  on public.project_positions for select
  using (true);

-- Project owners and maintainers can manage positions
create policy "owner and maintainer can insert positions"
  on public.project_positions for insert
  with check (
    exists (
      select 1 from public.project_members
      where project_id = project_positions.project_id
        and user_id = auth.uid()
        and role in ('owner', 'maintainer')
    )
  );

create policy "owner and maintainer can update positions"
  on public.project_positions for update
  using (
    exists (
      select 1 from public.project_members
      where project_id = project_positions.project_id
        and user_id = auth.uid()
        and role in ('owner', 'maintainer')
    )
  );

create policy "owner and maintainer can delete positions"
  on public.project_positions for delete
  using (
    exists (
      select 1 from public.project_members
      where project_id = project_positions.project_id
        and user_id = auth.uid()
        and role in ('owner', 'maintainer')
    )
  );

-- ── RPC: create_project ──────────────────────────────────────────────────────

create or replace function public.create_project(
  p_team_id uuid,
  p_name text,
  p_slug text,
  p_description text default null,
  p_status text default 'planning',
  p_visibility text default 'public',
  p_github_url text default null,
  p_website_url text default null,
  p_logo_url text default null,
  p_banner_url text default null
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
    team_id, owner_id, name, slug, description,
    status, visibility,
    github_url, website_url, logo_url, banner_url
  ) values (
    p_team_id, auth.uid(), p_name, p_slug, p_description,
    p_status, p_visibility,
    p_github_url, p_website_url, p_logo_url, p_banner_url
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

-- ── RPC: join_project ────────────────────────────────────────────────────────

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
  values (p_project_id, auth.uid(), 'contributor');

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

-- ── RPC: leave_project ───────────────────────────────────────────────────────

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

-- ── RPC: update_project ──────────────────────────────────────────────────────

create or replace function public.update_project(
  p_project_id uuid,
  p_name text default null,
  p_description text default null,
  p_status text default null,
  p_visibility text default null,
  p_github_url text default null,
  p_website_url text default null,
  p_logo_url text default null,
  p_banner_url text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.project_members
    where project_id = p_project_id
      and user_id = auth.uid()
      and role in ('owner', 'maintainer')
  ) then
    raise exception 'Only project owners or maintainers can update the project';
  end if;

  update public.projects set
    name         = coalesce(p_name, name),
    description  = coalesce(p_description, description),
    status       = coalesce(p_status, status),
    visibility   = coalesce(p_visibility, visibility),
    github_url   = coalesce(p_github_url, github_url),
    website_url  = coalesce(p_website_url, website_url),
    logo_url     = coalesce(p_logo_url, logo_url),
    banner_url   = coalesce(p_banner_url, banner_url),
    updated_at   = now()
  where id = p_project_id;
end;
$$;

-- ── RPC: delete_project ──────────────────────────────────────────────────────

create or replace function public.delete_project(p_project_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner_id uuid;
  v_project_name text;
  v_project_slug text;
begin
  select owner_id, name, slug into v_owner_id, v_project_name, v_project_slug
  from public.projects
  where id = p_project_id;

  if v_owner_id is null then
    raise exception 'Project not found';
  end if;

  if v_owner_id <> auth.uid() then
    raise exception 'Only the project owner can delete the project';
  end if;

  delete from public.project_positions where project_id = p_project_id;
  delete from public.project_members where project_id = p_project_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'deleted_project',
    jsonb_build_object(
      'project_id', p_project_id,
      'project_name', v_project_name,
      'project_slug', v_project_slug
    )
  );

  delete from public.projects where id = p_project_id;
end;
$$;

-- ── Storage: project-assets bucket ──────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('project-assets', 'project-assets', true)
on conflict (id) do nothing;

create policy "project assets are publicly readable"
  on storage.objects for select using (bucket_id = 'project-assets');

create policy "project owners can upload assets"
  on storage.objects for insert with check (
    bucket_id = 'project-assets'
    and exists (
      select 1 from public.project_members
      where project_members.project_id = (storage.foldername(name))[1]::uuid
        and project_members.user_id = auth.uid()
        and project_members.role = 'owner'
    )
  );

create policy "project owners can update assets"
  on storage.objects for update using (
    bucket_id = 'project-assets'
    and exists (
      select 1 from public.project_members
      where project_members.project_id = (storage.foldername(name))[1]::uuid
        and project_members.user_id = auth.uid()
        and project_members.role = 'owner'
    )
  );

create policy "project owners can delete assets"
  on storage.objects for delete using (
    bucket_id = 'project-assets'
    and exists (
      select 1 from public.project_members
      where project_members.project_id = (storage.foldername(name))[1]::uuid
        and project_members.user_id = auth.uid()
        and project_members.role = 'owner'
    )
  );
