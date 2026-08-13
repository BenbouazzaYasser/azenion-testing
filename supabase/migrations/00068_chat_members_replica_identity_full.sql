-- Migration: 00068_chat_members_replica_identity_full
--
-- ROOT CAUSE: Messenger-style read receipts depend on a realtime UPDATE
-- subscription on conversation_members (the `chat-read:{conversationId}`
-- channel in chat-conversation.tsx) so a recipient's read position updates
-- live on the sender's open conversation.
--
-- conversation_members uses the DEFAULT replica identity (primary key `id`),
-- so a logical-replication UPDATE event only carries the primary key plus the
-- columns that changed (`last_read_at`). The unmodified `conversation_id` and
-- `user_id` columns are absent from `payload.new`, so the server-side realtime
-- filter `conversation_id=eq.<id>` never matches and the event is dropped.
-- No avatar is ever shown without a full page reload.
--
-- Fix: set REPLICA IDENTITY FULL so every UPDATE/DELETE event carries the full
-- row, letting realtime deliver the read-state change to the open chat.
-- (messages already sets this in 00047_chat_fix.sql; this applies the same to
-- conversation_members.)

alter table public.conversation_members replica identity full;
