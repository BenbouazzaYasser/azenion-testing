-- Home page community numbers: single RPC to avoid 4 parallel HEAD count queries.
-- Returns members, teams, projects, branches in one round-trip.
create or replace function public.get_home_counts()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'members', (select count(*) from public.profiles),
    'teams', (select count(*) from public.teams),
    'projects', (select count(*) from public.projects),
    'branches', (select count(*) from public.branches)
  );
$$;

grant execute on function public.get_home_counts() to anon, authenticated, service_role;
