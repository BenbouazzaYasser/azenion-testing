-- Migration: 00101_update_course_manager_gate
--
-- Updates is_course_manager() to use the new platform roles system
-- (has_platform_role) instead of the old user_roles join.

create or replace function public.is_course_manager()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.has_platform_role('core_team_member')
     or public.has_platform_role('creator');
$$;

grant execute on function public.is_course_manager()
  to anon, authenticated, service_role;