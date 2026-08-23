-- Migration: 00075_call_peer_exec_revoke
--
-- Postgres grants EXECUTE to PUBLIC by default, so get_call_peer (00074) was
-- executable by anon. The function is safe regardless (auth.uid() is NULL for
-- anon, so it always returns zero rows), but lock it down so only authenticated
-- users can invoke it.

revoke execute on function public.get_call_peer(uuid, uuid) from public, anon;
grant execute on function public.get_call_peer(uuid, uuid)
  to authenticated;
