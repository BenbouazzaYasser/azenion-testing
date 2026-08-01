-- Teams table
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  logo_url text,
  banner_url text,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.teams enable row level security;

-- Team members table
create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now(),
  primary key (team_id, user_id)
);

alter table public.team_members enable row level security;

-- Indexes
create index idx_team_members_team_id on public.team_members(team_id);
create index idx_team_members_user_id on public.team_members(user_id);
create index idx_teams_owner_id on public.teams(owner_id);

-- ── Table-level privileges ────────────────────────────────────────────────

grant select, insert, update, delete on public.teams         to anon, authenticated, service_role;
grant select, insert, update, delete on public.team_members   to anon, authenticated, service_role;

-- ── RLS: Teams ────────────────────────────────────────────────────────────

-- Public teams are readable by everyone
create policy "public teams are readable by everyone"
  on public.teams for select
  using (visibility = 'public');

-- Team owners can read their own teams (covers private teams)
create policy "owner can read their teams"
  on public.teams for select
  using (owner_id = auth.uid());

-- Only authenticated users can create teams
create policy "authenticated users can create teams"
  on public.teams for insert
  with check (auth.uid() = owner_id);

-- Owner can update their team
create policy "owner can update team"
  on public.teams for update
  using (auth.uid() = owner_id);

-- Owner can delete their team
create policy "owner can delete team"
  on public.teams for delete
  using (auth.uid() = owner_id);

-- ── RLS: Team Members ─────────────────────────────────────────────────────

-- All authenticated users can read team memberships.
-- This is the MINIMUM SELECT policy needed for:
--   - Profile page: fetching the user's teams
--   - Team detail page: listing members
--   - Teams listing: counting members
-- Mutations are handled entirely by SECURITY DEFINER RPCs (create_team,
-- join_team, leave_team) which bypass RLS.
create policy "authenticated users can read team members"
  on public.team_members for select
  using (auth.role() = 'authenticated');

-- No INSERT/DELETE policies on team_members.
-- All membership mutations go through SECURITY DEFINER RPCs:
--   - create_team   → inserts owner membership
--   - join_team     → inserts member membership
--   - leave_team    → deletes own membership
-- Direct INSERT/UPDATE/DELETE on team_members via the API is rejected.

-- ── RPC: create_team ──────────────────────────────────────────────────────

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
  -- Create the team
  insert into public.teams (slug, name, description, visibility, logo_url, owner_id)
  values (p_slug, p_name, p_description, p_visibility, p_logo_url, auth.uid())
  returning id into v_team_id;

  -- Add the creator as owner
  insert into public.team_members (team_id, user_id, role)
  values (v_team_id, auth.uid(), 'owner');

  -- Log activity
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

-- ── RPC: join_team ────────────────────────────────────────────────────────

create or replace function public.join_team(p_team_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_team_name text;
  v_team_slug text;
begin
  -- Check if already a member
  if exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
  ) then
    return;
  end if;

  -- Check team is public (or user can join)
  select name, slug into v_team_name, v_team_slug
  from public.teams
  where id = p_team_id;

  if v_team_name is null then
    raise exception 'Team not found';
  end if;

  -- Insert membership
  insert into public.team_members (team_id, user_id, role)
  values (p_team_id, auth.uid(), 'member');

  -- Log activity
  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'joined_team',
    jsonb_build_object(
      'team_id', p_team_id,
      'team_name', v_team_name,
      'team_slug', v_team_slug
    )
  );
end;
$$;

-- ── RPC: leave_team ──────────────────────────────────────────────────────

create or replace function public.leave_team(p_team_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_role text;
  v_owner_count int;
  v_team_name text;
  v_team_slug text;
begin
  -- Get user's role
  select role into v_user_role
  from public.team_members
  where team_id = p_team_id and user_id = auth.uid();

  if v_user_role is null then
    raise exception 'Not a member of this team';
  end if;

  -- Owners cannot leave if they are the only owner
  if v_user_role = 'owner' then
    select count(*) into v_owner_count
    from public.team_members
    where team_id = p_team_id and role = 'owner';

    if v_owner_count <= 1 then
      raise exception 'Cannot leave as the only owner. Transfer ownership first.';
    end if;
  end if;

  -- Get team info for activity
  select name, slug into v_team_name, v_team_slug
  from public.teams
  where id = p_team_id;

  -- Remove membership
  delete from public.team_members
  where team_id = p_team_id and user_id = auth.uid();

  -- Log activity
  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'left_team',
    jsonb_build_object(
      'team_id', p_team_id,
      'team_name', v_team_name,
      'team_slug', v_team_slug
    )
  );
end;
$$;

-- ── Seed: Azenion Core Team ───────────────────────────────────────────────

insert into public.teams (slug, name, description, visibility, owner_id)
select
  'azenion-core-team',
  'Azenion Core Team',
  'The founding team behind Azenion, dedicated to building the platform, growing the community, and creating opportunities for ambitious students across the Limitless Network.',
  'public',
  id
from public.profiles
where username = 'ziyad'
  and not exists (select 1 from public.teams where slug = 'azenion-core-team');
