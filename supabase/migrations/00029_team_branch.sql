-- Migration: 00029_team_branch
--
-- Gives every team an explicit branch affiliation so branch hubs can show
-- "every team whose branch is this branch" and derive the branch-scoped feed.

alter table public.teams
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

create index if not exists teams_branch_id_idx on public.teams (branch_id);

-- Backfill existing teams from their owner's branch membership
-- (each user belongs to at most one branch).
update public.teams t
set branch_id = bm.branch_id
from public.branch_members bm
where t.owner_id = bm.user_id
  and t.branch_id is null;

-- New teams inherit the creator's branch automatically.
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
  v_branch_id uuid;
begin
  select branch_id into v_branch_id
  from public.branch_members
  where user_id = auth.uid()
  limit 1;

  -- Create the team
  insert into public.teams (slug, name, description, visibility, logo_url, owner_id, branch_id)
  values (p_slug, p_name, p_description, p_visibility, p_logo_url, auth.uid(), v_branch_id)
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
