-- Migration: 00110_chat_media_foundation
--
-- Phase 1 — Attachment Foundation. Secure private chat media.
--
--   * private bucket `chat-media` (public=false)
--   * helper `can_access_chat_media` / `can_manage_chat_media` (conversation-member check)
--   * storage.objects policies for chat-media (no public URLs)
--   * table `chat_message_attachments` (denormalized conversation_id for RLS/indexing)
--   * attachment RLS via public.is_conversation_member()
--   * trigger to ensure attachment conversation matches its message
--   * realtime publication for attachments
--
-- Every attachment belongs to an existing message; conversation_id is denormalized
-- for efficient RLS and to avoid a join in the storage policy path check.

-- ── 1. Helpers: conversation-scoped storage access ───────────────────────────

create or replace function public.can_access_chat_media(p_path text)
returns boolean
language plpgsql
security definer set search_path = public, storage
stable
as $$
declare
  v_prefix text;
  v_conv_id uuid;
  v_uid uuid := auth.uid();
begin
  -- path is expected to be "chat/{conversationId}/..."
  -- storage.foldername('chat/<uuid>/file') -> {chat, <uuid>}
  v_prefix := (storage.foldername(p_path))[1];
  if v_prefix is distinct from 'chat' then
    return false;
  end if;

  begin
    v_conv_id := ((storage.foldername(p_path))[2])::uuid;
  exception when others then
    return false;
  end;

  if v_conv_id is null then
    return false;
  end if;

  -- Platform admins bypass (if helper exists) — guarded via exception so
  -- migration does not fail when the helper is not present in older envs.
  begin
    if public.is_platform_admin() then
      return true;
    end if;
  exception when others then
    -- no admin helper — ignore
    null;
  end;

  return public.is_conversation_member(v_conv_id, v_uid);
end;
$$;

grant execute on function public.can_access_chat_media(text)
  to anon, authenticated, service_role;

create or replace function public.can_manage_chat_media(p_path text)
returns boolean
language plpgsql
security definer set search_path = public, storage
stable
as $$
declare
  v_prefix text;
  v_conv_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  v_prefix := (storage.foldername(p_path))[1];
  if v_prefix is distinct from 'chat' then
    return false;
  end if;

  begin
    v_conv_id := ((storage.foldername(p_path))[2])::uuid;
  exception when others then
    return false;
  end;

  if v_conv_id is null then
    return false;
  end if;

  begin
    if public.is_platform_admin() then
      return true;
    end if;
  exception when others then
    null;
  end;

  return public.is_conversation_member(v_conv_id, auth.uid());
end;
$$;

grant execute on function public.can_manage_chat_media(text)
  to anon, authenticated, service_role;

-- ── 2. Bucket: chat-media (private) ─────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', false)
on conflict (id) do nothing;

-- Ensure it stays private even if a prior manual creation set public=true
update storage.buckets set public = false where id = 'chat-media';

-- ── 3. Storage RLS policies for chat-media ──────────────────────────────────
-- Distinct names to avoid conflicts with existing private-media / avatar policies.

drop policy if exists "chat members can read chat media" on storage.objects;
create policy "chat members can read chat media"
  on storage.objects for select
  using (
    bucket_id = 'chat-media'
    and public.can_access_chat_media(name)
  );

drop policy if exists "chat members can upload chat media" on storage.objects;
create policy "chat members can upload chat media"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-media'
    and public.can_manage_chat_media(name)
  );

drop policy if exists "chat members can update chat media" on storage.objects;
create policy "chat members can update chat media"
  on storage.objects for update
  using (
    bucket_id = 'chat-media'
    and public.can_manage_chat_media(name)
  );

drop policy if exists "chat members can delete chat media" on storage.objects;
create policy "chat members can delete chat media"
  on storage.objects for delete
  using (
    bucket_id = 'chat-media'
    and public.can_manage_chat_media(name)
  );

-- ── 4. Table: chat_message_attachments ──────────────────────────────────────

create table if not exists public.chat_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('image','file','audio','gif','sticker')),
  storage_path text, -- null for gif/sticker provider objects
  filename text,
  mime_type text,
  file_size integer check (file_size is null or file_size >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  provider text, -- e.g. 'tenor' | 'giphy' for gif, null otherwise
  external_id text, -- provider-side id for gif/sticker
  metadata jsonb default '{}' not null,
  created_at timestamptz not null default now(),
  -- storage-backed types must have a path; provider types must not rely on storage
  constraint chat_attachments_storage_check check (
    (type in ('image','file','audio') and storage_path is not null)
    or (type in ('gif','sticker'))
  )
);

alter table public.chat_message_attachments enable row level security;

create index if not exists idx_chat_attachments_message_id
  on public.chat_message_attachments(message_id);
create index if not exists idx_chat_attachments_conversation_id
  on public.chat_message_attachments(conversation_id);
create index if not exists idx_chat_attachments_uploader_id
  on public.chat_message_attachments(uploader_id);
create index if not exists idx_chat_attachments_created_at
  on public.chat_message_attachments(created_at desc);

comment on table public.chat_message_attachments is
  'Private chat attachments. Each row belongs to a message; conversation_id is denormalized for RLS/indexing. Storage lives in chat-media bucket with path chat/{conversationId}/...';
comment on column public.chat_message_attachments.storage_path is
  'Object path inside chat-media bucket (e.g. chat/{conversationId}/{attachmentId}/{filename}), or null for provider-backed gif/sticker.';
comment on column public.chat_message_attachments.metadata is
  'Provider-agnostic JSON: image dimensions, gif preview URLs, sticker pack id, etc.';

-- ── 5. Validate that attachment conversation matches its message ─────────────

create or replace function public.validate_chat_attachment_conversation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_msg_conv uuid;
begin
  select conversation_id into v_msg_conv
  from public.messages
  where id = NEW.message_id;

  if v_msg_conv is null then
    raise exception 'Message % does not exist', NEW.message_id;
  end if;

  if v_msg_conv <> NEW.conversation_id then
    raise exception 'Attachment conversation % does not match message conversation %', NEW.conversation_id, v_msg_conv;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_validate_chat_attachment_conversation
  on public.chat_message_attachments;
create trigger trg_validate_chat_attachment_conversation
  before insert or update on public.chat_message_attachments
  for each row execute function public.validate_chat_attachment_conversation();

-- ── 6. RLS: attachments are visible only to conversation members ─────────────

drop policy if exists "conversation members can read attachments" on public.chat_message_attachments;
create policy "conversation members can read attachments"
  on public.chat_message_attachments for select
  using (public.is_conversation_member(conversation_id));

drop policy if exists "conversation members can create attachments" on public.chat_message_attachments;
create policy "conversation members can create attachments"
  on public.chat_message_attachments for insert
  with check (
    uploader_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );

drop policy if exists "uploaders can update their attachments" on public.chat_message_attachments;
create policy "uploaders can update their attachments"
  on public.chat_message_attachments for update
  using (
    uploader_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  )
  with check (
    uploader_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );

drop policy if exists "uploaders can delete their attachments" on public.chat_message_attachments;
create policy "uploaders can delete their attachments"
  on public.chat_message_attachments for delete
  using (
    uploader_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );

-- Grants
grant select, insert, update, delete
  on public.chat_message_attachments to authenticated, service_role;
grant select on public.chat_message_attachments to anon;

-- ── 7. Realtime ─────────────────────────────────────────────────────────────

alter table public.chat_message_attachments replica identity full;

do $$
begin
  -- Add to realtime publication if not already present; ignore if it is.
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_message_attachments'
  ) then
    alter publication supabase_realtime add table public.chat_message_attachments;
  end if;
exception when others then
  -- publication may not exist in local test env — do not fail migration
  null;
end $$;
