-- Migration: 00081_security_fix_unread_counts
--
-- Security remediation for the `get_unread_counts` IDOR.
--
-- PROBLEM (confirmed against main):
--   00067 granted EXECUTE to anon, authenticated, service_role and the function
--   accepts an arbitrary p_user_id with no auth.uid() check. An unauthenticated
--   anon client could therefore call it with any user UUID and read that user's
--   unread conversation counts. 00069 later recreated the function body (adding
--   the archived/deleted filter) but `CREATE OR REPLACE` preserves existing
--   grants, so the anon grant survived.
--
-- FIX:
--   * Pin the function to the authenticated caller, mirroring the existing
--     get_users_that_blocked_me() pattern (00071): the caller may only ever
--     query their own unread counts.
--   * Remove EXECUTE for anon AND public (00067's `grant ... to anon,
--     authenticated, service_role` left a PUBLIC grant in place — verified as
--     `=X/postgres` on the live project — and `anon` inherits EXECUTE through
--     its PUBLIC membership, so revoking from anon alone is not enough).
--   * Keep authenticated + service_role EXECUTE. Like get_users_that_blocked_me,
--     service_role calls have auth.uid() = NULL and therefore return no rows;
--     the platform never calls this RPC through the service role (all callers
--     use the authenticated server client with the caller's own id).
--
-- This is the FINAL definition of the function, superseding both the 00067 and
-- 00069 bodies regardless of which is present in the target database.

create or replace function public.get_unread_counts(p_user_id uuid)
returns table (conversation_id uuid, unread_count bigint)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    return;
  end if;
  return query
    select m.conversation_id, count(*)::bigint as unread_count
    from public.messages m
    join public.conversation_members cm
      on cm.conversation_id = m.conversation_id
    where cm.user_id = p_user_id
      and cm.archived_at is null
      and cm.deleted_at is null
      and m.sender_id <> p_user_id
      and m.created_at > coalesce(cm.last_read_at, '1970-01-01'::timestamptz)
    group by m.conversation_id;
end;
$$;

revoke execute on function public.get_unread_counts(uuid) from public;
revoke execute on function public.get_unread_counts(uuid) from anon;
grant execute on function public.get_unread_counts(uuid)
  to authenticated, service_role;