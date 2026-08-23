-- Migration: 00074_call_peer_resolution
--
-- Secure caller-profile resolution for the incoming-call popup.
--
-- Problem: the general profiles SELECT policy only lets a user read their own
-- profile (auth.uid() = id, see 00004_rls_fix), so a receiving browser cannot
-- resolve the caller's name/avatar for the incoming-call UI. We must NOT
-- weaken that policy.
--
-- Solution: a SECURITY DEFINER RPC that returns a profile row only when BOTH
-- the calling user (auth.uid()) and the requested user are members of the same
-- conversation. It exposes nothing beyond the peer of a conversation you are
-- already a member of, and mirrors the existing get_or_create_conversation /
-- is_conversation_member pattern (00047).

create or replace function public.get_call_peer(
  p_conversation_id uuid,
  p_user_id uuid
)
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  username text
)
language sql
stable
security definer set search_path = public
as $$
  select p.id, p.full_name, p.avatar_url, p.username
  from public.profiles p
  where p.id = p_user_id
    and public.is_conversation_member(p_conversation_id, auth.uid())
    and public.is_conversation_member(p_conversation_id, p_user_id)
$$;

grant execute on function public.get_call_peer(uuid, uuid)
  to authenticated;
