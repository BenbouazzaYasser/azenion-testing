-- Migration: 00115_fix_security_visibility_role
--
-- Fixes invalid role name 'authenticated_user' in get_user_teams function.
-- Should be 'authenticated' per Supabase docs. The old check never matched,
-- so the authorization bypass it was supposed to handle never triggered.

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
  if p_user_id is distinct from auth.uid()
     and coalesce(auth.role(), '') not in ('service_role', 'supabase_admin', 'authenticated')
  then
    raise exception 'Not authorized to view this user''s teams';
  end if;

  return query
  select
    tm.team_id,
    tm.role,
    t.slug,
    t.name,
    t.logo_url
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where tm.user_id = p_user_id;
end;
$$;

grant execute on function public.get_user_teams(uuid) to authenticated, service_role;
