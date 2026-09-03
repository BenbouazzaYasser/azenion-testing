-- Migration: 00114_fix_leave_user_server
--
-- Fixes leave_user_server SQL clears owner_id on every member leave.
-- Previously after deleting a leaving member (where role <> 'owner'), the function
-- unconditionally ran UPDATE public.servers SET owner_id = null, orphaning the owner.
-- Fix: only clear owner_id if the leaving user is actually the owner.

create or replace function public.leave_user_server(p_server_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (select 1 from public.servers where id = p_server_id and kind = 'user') then
    raise exception 'Team and branch servers are managed automatically through your membership';
  end if;

  delete from public.server_members
  where server_id = p_server_id and user_id = auth.uid() and role <> 'owner';

  -- Only clear owner_id if the leaving user IS the owner (defensive, though role guard above prevents owner from leaving via this path)
  if exists (select 1 from public.servers where id = p_server_id and owner_id = auth.uid()) then
    update public.servers set owner_id = null where id = p_server_id;
  end if;
end;
$$;

grant execute on function public.leave_user_server(uuid) to authenticated;
