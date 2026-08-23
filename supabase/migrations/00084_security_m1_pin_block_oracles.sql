-- Migration: 00084_security_m1_pin_block_oracles
--
-- M1 (medium): authenticated block/relationship probe oracles.
--
-- PROBLEM
--   is_user_blocked / is_relationship_blocked trust both ids verbatim and
--   is_blocked_by_conversation_peer trusts an arbitrary supplied sender id.
--   Any authenticated caller could therefore probe arbitrary pairs of users
--   and learn whether a block/relationship restriction exists between them.
--
-- FIX
--   Pin the queries to the caller:
--     * is_user_blocked(blocker, blocked): non-service callers may only get an
--       answer when auth.uid() is one of the two parties (this is the only
--       shape the app uses — the caller is always a participant).
--     * is_relationship_blocked(actor, target): same two-party rule.
--     * is_blocked_by_conversation_peer(conversation, sender): non-service
--       callers always evaluate for auth.uid(); the supplied sender id is
--       ignored (the messages INSERT policy already passes auth.uid()).
--   All legitimate callers are self-scoped and remain unaffected:
--     * get_or_create_conversation: is_user_blocked(p_user_id, auth.uid())
--     * share_post RPCs: is_user_blocked(v_sharer, p_recipient_id) /
--       is_user_blocked(p_recipient_id, v_sharer) with v_sharer = auth.uid()
--     * send_friend_request / follow_user: is_relationship_blocked(auth.uid(), …)
--   service_role / supabase_admin keep unrestricted answers (admin client).
--
--   These functions were granted `to authenticated, service_role` only, but
--   the implicit PUBLIC EXECUTE grant (left by their original creation) still
--   lets anon inherit EXECUTE. anon never legitimately calls them, so EXECUTE
--   is revoked from public AND anon for defense-in-depth; the pinning above is
--   the actual oracle fix.

-- ── is_user_blocked ──────────────────────────────────────────────────────────

create or replace function public.is_user_blocked(
  p_blocker_id uuid,
  p_blocked_id uuid
)
returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if coalesce(auth.role(), '') not in ('service_role', 'supabase_admin')
     and auth.uid() not in (p_blocker_id, p_blocked_id) then
    return false;
  end if;

  return exists (
    select 1 from public.user_blocks
    where blocker_id = p_blocker_id
      and blocked_id = p_blocked_id
  );
end;
$$;

revoke execute on function public.is_user_blocked(uuid, uuid) from public;
revoke execute on function public.is_user_blocked(uuid, uuid) from anon;
grant execute on function public.is_user_blocked(uuid, uuid)
  to authenticated, service_role;

-- ── is_relationship_blocked ──────────────────────────────────────────────────

create or replace function public.is_relationship_blocked(
  p_actor_id uuid,
  p_target_id uuid
)
returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if coalesce(auth.role(), '') not in ('service_role', 'supabase_admin')
     and auth.uid() not in (p_actor_id, p_target_id) then
    return false;
  end if;

  return exists (
    select 1 from public.user_blocks
    where (blocker_id = p_actor_id and blocked_id = p_target_id)
       or (blocker_id = p_target_id and blocked_id = p_actor_id)
  );
end;
$$;

revoke execute on function public.is_relationship_blocked(uuid, uuid) from public;
revoke execute on function public.is_relationship_blocked(uuid, uuid) from anon;
grant execute on function public.is_relationship_blocked(uuid, uuid)
  to authenticated, service_role;

-- ── is_blocked_by_conversation_peer ──────────────────────────────────────────

create or replace function public.is_blocked_by_conversation_peer(
  p_conversation_id uuid,
  p_sender_id uuid default auth.uid()
)
returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_sender uuid;
begin
  if coalesce(auth.role(), '') in ('service_role', 'supabase_admin') then
    v_sender := coalesce(p_sender_id, auth.uid());
  else
    v_sender := auth.uid();
  end if;

  return exists (
    select 1
    from public.conversation_members cm
    join public.user_blocks ub
      on ub.blocker_id = cm.user_id
     and ub.blocked_id = v_sender
    where cm.conversation_id = p_conversation_id
      and cm.user_id <> v_sender
  );
end;
$$;

revoke execute on function public.is_blocked_by_conversation_peer(uuid, uuid) from public;
revoke execute on function public.is_blocked_by_conversation_peer(uuid, uuid) from anon;
grant execute on function public.is_blocked_by_conversation_peer(uuid, uuid)
  to authenticated, service_role;