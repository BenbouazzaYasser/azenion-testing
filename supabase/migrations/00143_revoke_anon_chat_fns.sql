-- Migration: 00143_revoke_anon_chat_fns
--
-- Supabase default privileges grant anon execute on every new function; the
-- 00142 additions only granted to authenticated/service_role, leaving the
-- anon grant in place. None of these are callable usefully by anon:
--   * send_chat_message / get_last_messages: called server-side with the
--     user's session (authenticated) — anon always gets empty/exception.

revoke execute on function public.send_chat_message(uuid, text, jsonb) from anon;
revoke execute on function public.get_last_messages(uuid[]) from anon;

-- ── End of migration ────────────────────────────────────────────────────────
