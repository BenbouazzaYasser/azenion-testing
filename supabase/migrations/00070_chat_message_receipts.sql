-- Migration: 00070_chat_message_receipts
--
-- Adds per-message delivery tracking so messages can show a
-- sent / received / seen status in the chat list and the thread.
--
--   * sent      -> row exists (written to the server by the sender)
--   * received  -> received_at set, meaning the recipient's client has
--                  acknowledged the message (see mark_messages_received)
--   * seen      -> the recipient's conversation_members.last_read_at is
--                  newer than the message's created_at
--
-- Security follows the model established in 00047_chat_fix.sql:
--   * Recipients cannot UPDATE another member's message row directly (RLS
--     only lets senders edit their own messages), so the ack helper is
--     SECURITY DEFINER and only ever touches rows that the calling member
--     is allowed to read, never the caller's own messages.

-- ── 1. received_at column ────────────────────────────────────────────────
alter table public.messages
  add column if not exists received_at timestamptz;

-- ── 2. Delivery-ack helper ───────────────────────────────────────────────
-- Marks every message the calling member is allowed to see as received
-- (i.e. messages sent by the *other* member of a conversation they belong
-- to that have not been acked yet). Returns the number of affected rows.
create or replace function public.mark_messages_received(p_conversation_id uuid)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_updated integer;
begin
  if not public.is_conversation_member(p_conversation_id) then
    return 0;
  end if;

  update public.messages
     set received_at = coalesce(received_at, now())
   where conversation_id = p_conversation_id
     and sender_id <> auth.uid()
     and received_at is null;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

grant execute on function public.mark_messages_received(uuid)
  to authenticated, service_role;