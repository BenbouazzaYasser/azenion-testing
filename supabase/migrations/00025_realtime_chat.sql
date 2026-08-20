-- Migration: 00025_realtime_chat
--
-- Enables Supabase Realtime for instant messaging.
-- Messages and conversations are published so subscribers get live updates.

-- ── Enable Realtime for chat tables ─────────────────────────────────────

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_members;
