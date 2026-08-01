-- Migration: 00022_multi_category
--
-- Replaces single category_id on teams with proper many-to-many via
-- team_category_members pivot.  Creates project_categories + pivot table
-- so projects can also belong to multiple categories.

-- ── Project categories table ───────────────────────────────────────────

create table if not exists public.project_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

alter table public.project_categories enable row level security;

create policy "project categories are publicly readable"
  on public.project_categories for select using (true);

grant select on public.project_categories to anon, authenticated, service_role;

-- Seed project categories with the same names as team categories
insert into public.project_categories (name, slug)
select name, slug from public.team_categories
on conflict (name) do nothing;

-- ── Pivot: team_category_members ───────────────────────────────────────

create table if not exists public.team_category_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  category_id uuid not null references public.team_categories(id) on delete cascade,
  primary key (team_id, category_id)
);

alter table public.team_category_members enable row level security;

create policy "team category members are publicly readable"
  on public.team_category_members for select using (true);

grant select, insert, update, delete
  on public.team_category_members to anon, authenticated, service_role;

-- ── Pivot: project_category_members ────────────────────────────────────

create table if not exists public.project_category_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  category_id uuid not null references public.project_categories(id) on delete cascade,
  primary key (project_id, category_id)
);

alter table public.project_category_members enable row level security;

create policy "project category members are publicly readable"
  on public.project_category_members for select using (true);

grant select, insert, update, delete
  on public.project_category_members to anon, authenticated, service_role;

-- ── Migrate existing team categories ───────────────────────────────────

insert into public.team_category_members (team_id, category_id)
select id, category_id from public.teams
where category_id is not null;

-- ── Drop the old column ────────────────────────────────────────────────

alter table public.teams drop column if exists category_id;

-- ── Update RPC: update_team (remove p_category_id) ─────────────────────

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
    technologies = coalesce(p_technologies, technologies),
    updated_at  = now()
  where id = p_team_id;

  -- Note: p_category_id is kept as a parameter for backward compatibility
  -- but no longer writes to the teams table. Category management is handled
  -- via the team_category_members pivot table in server actions.
end;
$$;

grant execute on function public.update_team(uuid, text, text, text, text, text, text, uuid, text[]) to anon, authenticated, service_role;
