-- Migration: 00148_remove_gif_attachments
--
-- Drops the GIF chat feature (picker, /api/chat/gif/search, lib/gif/provider).
-- Provider-backed attachments are now sticker-only.
--
-- Order matters: the row deletes run while the old constraints still accept
-- 'gif'; the constraints are tightened afterwards.

-- 1. Data cleanup
-- Media-only messages whose sole attachment was a GIF would render as empty
-- bubbles once the attachment is gone - drop the message (the FK cascades).
delete from public.messages m
where btrim(m.content) = ''
  and exists (
    select 1 from public.chat_message_attachments a where a.message_id = m.id
  )
  and not exists (
    select 1 from public.chat_message_attachments a
    where a.message_id = m.id and a.type <> 'gif'
  );

delete from public.chat_message_attachments where type = 'gif';

-- 2. Type constraints
alter table public.chat_message_attachments
  drop constraint if exists chat_message_attachments_type_check;
alter table public.chat_message_attachments
  add constraint chat_message_attachments_type_check
  check (type in ('image','file','audio','sticker'));

alter table public.chat_message_attachments
  drop constraint if exists chat_attachments_storage_check;
alter table public.chat_message_attachments
  add constraint chat_attachments_storage_check
  check (
    (type in ('image','file','audio') and storage_path is not null)
    or (type = 'sticker')
  );

comment on column public.chat_message_attachments.storage_path is
  'Object path inside chat-media bucket (e.g. chat/{conversationId}/{attachmentId}/{filename}), or null for provider-backed stickers.';
comment on column public.chat_message_attachments.provider is
  'Provider for provider-backed attachments (''local'' for stickers), null otherwise.';

-- 3. Validation trigger: sticker is the only provider-backed type
create or replace function public.validate_chat_attachment_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $fn$
declare
  v_mime text;
  v_size integer;
  v_is_image boolean;
  v_is_file boolean;
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
  elsif NEW.type = 'sticker' then
    if NEW.provider is null or length(trim(NEW.provider)) = 0 then
      raise exception 'Provider required for %', NEW.type;
    end if;
    if NEW.provider != 'local' then
      raise exception 'Provider % not allowed for sticker', NEW.provider;
    end if;
    if NEW.external_id is null or length(trim(NEW.external_id)) = 0 then
      raise exception 'External ID required for %', NEW.type;
    end if;
    if NEW.storage_path is not null then
      raise exception 'storage_path must be null for provider-backed attachments';
    end if;
  end if;

  return NEW;
end;
$fn$;

drop function if exists public.is_allowed_gif_host(text, text);
