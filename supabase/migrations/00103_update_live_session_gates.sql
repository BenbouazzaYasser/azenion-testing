-- Migration: 00103_update_live_session_gates
--
-- Updates live session management gates to use the new platform roles
-- and instructor verification system.

-- ── Update can_manage_live_session_host ───────────────────────────────────────

create or replace function public.can_manage_live_session_host(
  p_host_type text,
  p_host_id uuid
)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.can_host_live_sessions(p_host_type, p_host_id);
$$;

grant execute on function public.can_manage_live_session_host(text, uuid)
  to anon, authenticated, service_role;

-- ── Update can_manage_live_session ────────────────────────────────────────────

create or replace function public.can_manage_live_session(p_session_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    public.is_platform_admin()
    or public.has_platform_role('instructor')
    or (
      ls.host_type = 'BRANCH'
      and public.is_branch_leader(ls.host_id)
    )
    or (
      ls.host_type = 'TEAM'
      and public.has_team_permission(ls.host_id, 'MANAGE_LIVE_SESSIONS')
    )
    or ls.created_by = auth.uid()
  from public.live_sessions ls
  where ls.id = p_session_id;
$$;

grant execute on function public.can_manage_live_session(uuid)
  to anon, authenticated, service_role;

-- ── Update get_manageable_session_hosts ───────────────────────────────────────

create or replace function public.get_manageable_session_hosts()
returns table (host_type text, host_id uuid, host_name text)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  if public.is_platform_admin() or public.has_platform_role('instructor') then
    return query
      select 'BRANCH'::text, b.id, b.name from public.branches b
      union all
      select 'TEAM'::text, t.id, t.name from public.teams t
      order by 3;
    return;
  end if;

  return query
    select 'BRANCH'::text, b.id, b.name
    from public.branch_leaders bl
    join public.branches b on b.id = bl.branch_id
    where bl.user_id = auth.uid()
    union all
    select 'TEAM'::text, t.id, t.name
    from public.teams t
    where public.has_team_permission(t.id, 'CREATE_LIVE_SESSIONS')
       or public.has_team_permission(t.id, 'MANAGE_LIVE_SESSIONS')
    order by 3;
end;
$$;

grant execute on function public.get_manageable_session_hosts()
  to authenticated, service_role;