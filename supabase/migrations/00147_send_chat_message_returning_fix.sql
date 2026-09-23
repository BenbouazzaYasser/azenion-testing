-- Migration: 00147_send_chat_message_returning_fix
--
-- Bug (live 42702 on every chat image/attachment send via PostgREST):
-- send_chat_message is declared RETURNS TABLE(id uuid, created_at timestamptz).
-- RETURNS TABLE OUT columns are PL/pgSQL variables in scope inside the body,
-- so the unqualified `returning id, created_at` collided with the target
-- table's own columns: 'column reference "id" is ambiguous' at runtime
-- (function line 40; Postgres reports only the first ambiguous name, so
-- created_at is ambiguous too). Plain-text sends use a direct client insert,
-- which is why only attachment/image sends surfaced it.
-- Fix: qualify the RETURNING expressions with the target table so they always
-- resolve to the columns. OUT names are unchanged (they are the API response
-- keys the client reads). Swept every public plpgsql function with
-- `returning id` + TABLE result: this was the only one with the pattern.

create or replace function public.send_chat_message(
  p_conversation_id uuid,
  p_content text,
  p_attachments jsonb default '[]'::jsonb
)
returns table (id uuid, created_at timestamptz)
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_msg_id uuid;
  v_msg_created timestamptz;
  v_att_count integer := coalesce(jsonb_array_length(p_attachments), 0);
  v_other uuid;
  v_content text := coalesce(trim(p_content), '');
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Defense in depth: RLS also enforces membership on direct inserts.
  if not public.is_conversation_member(p_conversation_id, v_uid) then
    raise exception 'You are not a member of this conversation.';
  end if;

  -- Block guard (mirrors the RLS INSERT policy from 00071).
  select cm.user_id into v_other
  from public.conversation_members cm
  where cm.conversation_id = p_conversation_id
    and cm.user_id <> v_uid
  limit 1;

  if v_other is not null and public.is_user_blocked(v_other, v_uid) then
    raise exception 'You can''t send messages to this user because they blocked you.';
  end if;

  if v_content = '' and v_att_count = 0 then
    raise exception 'Message cannot be empty';
  end if;

  if v_att_count > 10 then
    raise exception 'Too many attachments. Max 10 per message.';
  end if;

  -- Single transaction: if any attachment trigger rejects a row, the message
  -- insert rolls back with it (replaces the app-level delete compensation).
  -- QUALIFIED: bare id/created_at are ambiguous with the RETURNS TABLE OUT
  -- variables of the same names (42702). See header of migration 00147.
  insert into public.messages (conversation_id, sender_id, content)
  values (p_conversation_id, v_uid, v_content)
  returning messages.id, messages.created_at into v_msg_id, v_msg_created;

  if v_att_count > 0 then
    insert into public.chat_message_attachments
      (message_id, conversation_id, uploader_id, type, storage_path, filename,
       mime_type, file_size, duration_seconds, provider, external_id, metadata)
    select
      v_msg_id,
      p_conversation_id,
      v_uid,
      a ->> 'type',
      a ->> 'storage_path',
      a ->> 'filename',
      a ->> 'mime_type',
      (a ->> 'file_size')::integer,
      (a ->> 'duration_seconds')::integer,
      a ->> 'provider',
      a ->> 'external_id',
      -- jsonb 'null' (or missing key) must become '{}', never SQL NULL
      coalesce(nullif(a -> 'metadata', 'null'::jsonb), '{}'::jsonb)
    from jsonb_array_elements(p_attachments) as a;
  end if;

  return query select v_msg_id, v_msg_created;
end;
$$;
