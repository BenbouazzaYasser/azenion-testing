-- Migration: 00142_chat_hardening
--
-- Chat audit fixes:
--   1. Revoke anon execution on membership/unread helpers that accept an
--      arbitrary p_user_id — they let anonymous callers probe any user's
--      conversation membership and unread counts.
--   2. send_chat_message: atomic message + attachment insert (single
--      transaction). Replaces the app-level two-round-trip insert + manual
--      rollback in actions/chat.actions.ts; the existing attachment triggers
--      (00110/00111/00112) still validate every row inside this transaction.
--   3. get_last_messages: one query for the sidebar's last message per
--      conversation (was one query per conversation). SECURITY INVOKER so
--      RLS applies — callers can only read conversations they belong to.
--   4. GIF domain validation: exact host-suffix check instead of substring
--      ILIKE (which "https://evil.com/?giphy.com" satisfied).

-- ── 1. Revoke anon execution ────────────────────────────────────────────────
-- SECURITY DEFINER callers (storage policies, other definer functions) check
-- privileges as the function *owner*, so revoking anon here does not break
-- any policy path — it only stops anonymous clients calling these directly.
revoke execute on function public.is_conversation_member(uuid, uuid) from anon;
revoke execute on function public.get_unread_counts(uuid) from anon;

-- ── 2. Atomic send ──────────────────────────────────────────────────────────
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
  insert into public.messages (conversation_id, sender_id, content)
  values (p_conversation_id, v_uid, v_content)
  returning id, created_at into v_msg_id, v_msg_created;

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

grant execute on function public.send_chat_message(uuid, text, jsonb)
  to authenticated, service_role;

comment on function public.send_chat_message(uuid, text, jsonb) is
  'Atomically insert a chat message and its attachments. Attachment triggers validate rows in the same transaction.';

-- ── 3. Sidebar last-message batch ───────────────────────────────────────────
create or replace function public.get_last_messages(p_conversation_ids uuid[])
returns table (
  conversation_id uuid,
  message_id uuid,
  content text,
  created_at timestamptz,
  sender_id uuid,
  received_at timestamptz
)
language sql
stable
as $$
  select distinct on (m.conversation_id)
    m.conversation_id, m.id, m.content, m.created_at, m.sender_id, m.received_at
  from public.messages m
  where m.conversation_id = any(p_conversation_ids)
  order by m.conversation_id, m.created_at desc;
$$;

grant execute on function public.get_last_messages(uuid[])
  to authenticated, service_role;

comment on function public.get_last_messages(uuid[]) is
  'Latest message per conversation for the sidebar. SECURITY INVOKER: RLS restricts rows to conversations the caller belongs to.';

-- ── 4. GIF host validation: exact suffix, not substring ─────────────────────
-- Host of a URL must be the provider domain itself or a subdomain of it.
-- Fail closed: any URL we cannot parse into a host is rejected.
create or replace function public.is_allowed_gif_host(p_url text, p_provider text)
returns boolean
language plpgsql
immutable
as $$
declare
  v_host text;
  v_expected text;
begin
  v_expected := case when p_provider = 'giphy' then 'giphy.com' else 'tenor.com' end;
  -- scheme → host: everything after '://' up to the first '/'
  v_host := lower(split_part(split_part(p_url, '://', 2), '/', 1));
  -- drop port (also blanks userinfo-bearing hosts like 'evil.com@giphy.com',
  -- which the suffix check would reject anyway — fail closed either way)
  v_host := split_part(v_host, ':', 1);
  if v_host = '' then
    return false;
  end if;
  return v_host = v_expected
      or right(v_host, length(v_expected) + 1) = '.' || v_expected;
end;
$$;

create or replace function public.validate_chat_attachment_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_mime text;
  v_size integer;
  v_is_image boolean;
  v_is_file boolean;
  v_url text;
begin
  if NEW.type in ('image','file','audio') then
    if NEW.storage_path is null or NEW.storage_path !~ '^chat/[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}/.+/.+$' then
      raise exception 'Invalid storage_path for attachment';
    end if;
    if NEW.filename is null or length(trim(NEW.filename)) = 0 then
      raise exception 'Filename is required';
    end if;
    if NEW.mime_type is null then
      raise exception 'MIME type is required';
    end if;
    v_mime := lower(NEW.mime_type);
    v_mime := split_part(v_mime, ';', 1);
    v_mime := btrim(v_mime);

    v_is_image := v_mime in ('image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif');
    v_is_file := v_mime in ('application/pdf','text/plain','text/csv','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/zip');

    if NEW.type = 'image' and not v_is_image then
      raise exception 'MIME % not allowed for image', NEW.mime_type;
    end if;
    if NEW.type = 'file' and not v_is_file then
      raise exception 'MIME % not allowed for file', NEW.mime_type;
    end if;
    if NEW.type = 'audio' and v_mime not in ('audio/webm','audio/ogg','audio/mpeg','audio/mp3','audio/wav','audio/mp4','audio/aac','audio/x-m4a') then
      if lower(NEW.mime_type) not in ('audio/webm;codecs=opus','audio/webm') then
        raise exception 'MIME % not allowed for audio', NEW.mime_type;
      end if;
    end if;

    v_size := NEW.file_size;
    if v_size is null or v_size <= 0 then
      raise exception 'Invalid file_size';
    end if;
    if NEW.type = 'image' and v_size > 8 * 1024 * 1024 then
      raise exception 'Image too large';
    end if;
    if NEW.type = 'file' and v_size > 25 * 1024 * 1024 then
      raise exception 'File too large';
    end if;
    if NEW.type = 'audio' and v_size > 10 * 1024 * 1024 then
      raise exception 'Audio too large';
    end if;
    if NEW.type = 'audio' and NEW.duration_seconds is not null and NEW.duration_seconds > 120 then
      raise exception 'Audio too long';
    end if;

    if NEW.provider is not null or NEW.external_id is not null then
      raise exception 'Provider fields must be null for storage-backed attachments';
    end if;
  elsif NEW.type in ('gif','sticker') then
    if NEW.provider is null or length(trim(NEW.provider)) = 0 then
      raise exception 'Provider required for %', NEW.type;
    end if;
    if NEW.type = 'gif' and NEW.provider not in ('giphy','tenor') then
      raise exception 'Provider % not allowed for gif', NEW.provider;
    end if;
    if NEW.type = 'sticker' and NEW.provider != 'local' then
      raise exception 'Provider % not allowed for sticker', NEW.provider;
    end if;
    if NEW.external_id is null or length(trim(NEW.external_id)) = 0 then
      raise exception 'External ID required for %', NEW.type;
    end if;
    if NEW.storage_path is not null then
      raise exception 'storage_path must be null for provider-backed attachments';
    end if;

    if NEW.type = 'gif' and NEW.metadata is not null then
      v_url := NEW.metadata ->> 'url';
      if v_url is not null and length(trim(v_url)) > 0
         and not public.is_allowed_gif_host(v_url, NEW.provider) then
        raise exception 'GIF URL domain not allowed for %: %', NEW.provider, v_url;
      end if;
      v_url := NEW.metadata ->> 'previewUrl';
      if v_url is not null and length(trim(v_url)) > 0
         and not public.is_allowed_gif_host(v_url, NEW.provider) then
        raise exception 'GIF preview URL domain not allowed for %: %', NEW.provider, v_url;
      end if;
    end if;
  end if;

  return NEW;
end;
$$;

-- ── End of migration ────────────────────────────────────────────────────────
