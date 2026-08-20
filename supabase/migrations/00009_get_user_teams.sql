-- Migration: 00009_get_user_teams
--
-- Adds a SECURITY DEFINER RPC to fetch a user's teams (with full team data)
-- bypassing RLS. This is needed because:
--
--   1. teams RLS policies only cover public teams or own teams (owner_id).
--      Members of private teams cannot read the team row directly.
--   2. A direct LEFT JOIN from team_members → teams returns null for the
--      team when RLS blocks the teams row, causing runtime errors.
--   3. Per the architecture rule, membership authorization lives in
--      SECURITY DEFINER functions, not in RLS policies.
--
-- This RPC is used by the profile page to list the user's teams.

create or replace function public.get_user_teams(p_user_id uuid)
returns table (
  team_id uuid,
  role text,
  team_slug text,
  team_name text,
  team_logo_url text
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  select
    tm.team_id,
    tm.role,
    t.slug,
    t.name,
    t.logo_url
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where tm.user_id = p_user_id
  order by t.name;
end;
$$;

grant execute on function public.get_user_teams(uuid) to anon, authenticated, service_role;
