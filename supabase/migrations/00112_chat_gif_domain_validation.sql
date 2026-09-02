-- Migration: 00112_chat_gif_domain_validation
--
-- Enhances gif validation to ensure persisted URLs are from approved provider
-- domains, preventing arbitrary external URL injection via direct client inserts.
-- Mirrors lib/gif/provider.ts allowlist.

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
    -- Validate GIF URLs are from approved domains if present in metadata (simple ILIKE check, no exception block)
    if NEW.type = 'gif' and NEW.metadata is not null then
      v_url := (NEW.metadata->>'url');
      if v_url is not null and length(trim(v_url)) > 0 then
        if NEW.provider = 'giphy' and v_url not ilike '%giphy.com%' then
          raise exception 'GIF URL domain not allowed for giphy: %', v_url;
        end if;
        if NEW.provider = 'tenor' and v_url not ilike '%tenor.com%' then
          raise exception 'GIF URL domain not allowed for tenor: %', v_url;
        end if;
      end if;
      v_url := (NEW.metadata->>'previewUrl');
      if v_url is not null and length(trim(v_url)) > 0 then
        if NEW.provider = 'giphy' and v_url not ilike '%giphy.com%' then
          raise exception 'GIF preview URL domain not allowed for giphy: %', v_url;
        end if;
        if NEW.provider = 'tenor' and v_url not ilike '%tenor.com%' then
          raise exception 'GIF preview URL domain not allowed for tenor: %', v_url;
        end if;
      end if;
    end if;
  end if;

  return NEW;
end;
$$;
