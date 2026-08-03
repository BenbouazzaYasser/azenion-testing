-- Migration: 00035_delete_branch_storage_refactor
--
-- Supabase forbids direct DML on storage.objects ("Direct deletion from
-- storage tables is not allowed. Use the Storage API instead."). The previous
-- delete_branch() (00028) deleted branch assets straight from storage.objects
-- inside the RPC, which raised that error and rolled back the whole branch
-- deletion.
--
-- Storage and database concerns are now split:
--   Storage API (JS SDK) deletes the files under branch-assets/<branch_id>/,
--   then this RPC only deletes database rows.
--
-- This file redefines delete_branch() to remove the storage.objects section.
-- Database logic, permissions, guards and cascades are unchanged.

create or replace function public.delete_branch(p_branch_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_member_count int;
  v_branch_name text;
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform administrator can manage branches';
  end if;

  select count(*) into v_member_count
  from public.branch_members
  where branch_id = p_branch_id;

  if v_member_count > 0 then
    raise exception 'This branch still has members';
  end if;

  select name into v_branch_name
  from public.branches
  where id = p_branch_id;

  delete from public.branches where id = p_branch_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'deleted_branch',
    jsonb_build_object(
      'branch_id', p_branch_id,
      'branch_name', v_branch_name
    )
  );
end;
$$;

grant execute on function public.delete_branch(uuid) to anon, authenticated, service_role;
