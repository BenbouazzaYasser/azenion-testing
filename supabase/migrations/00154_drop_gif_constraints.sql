-- ── Corrective: drop GIF support from ALREADY-migrated databases ────────────
--
-- The GIF removal was made by EDITING migration history (00110, 00111, 00113,
-- 00142, 00143, 00145) with 00112 deleted outright. That is correct for a
-- fresh `supabase db reset` but does nothing to a database that already
-- applied the old versions: editing history cannot reach a live database, only
-- a new migration can.
--
-- Verified against the hosted project (ref cytwlxpomhzdezgwlbhv, PostgreSQL
-- 17.6) on 2026-09-26. Findings:
--
--   * A migration named `remove_gif_attachments` had already been applied to
--     that database (ledger version 20260926005320). It had already repaired
--     BOTH CHECK constraints and had already dropped is_allowed_gif_host().
--     Zero rows had type='gif'; zero orphaned chat-media objects.
--
--   * ONE real trace survived: public.validate_chat_attachment_fields() was
--     still the pre-removal body, with 'image/gif' in its v_is_image list. It
--     is the only function in public still mentioning gif. Because the type
--     CHECK permits 'image', that trigger still accepted a GIF upload, so the
--     database was the last layer saying yes after the app had already
--     stopped accepting image/gif everywhere else.
--
-- So step 3 below is the fix that mattered. Steps 1, 2, 4 and 5 are
-- idempotent defences for environments not inspected here; against the hosted
-- project they are all no-ops.
--
-- This file must stay the highest-numbered migration: it repairs objects
-- created by 00110/00111, so it can only run after the chain defining them.
--
-- MAINTENANCE: the function body in step 3 is a copy of the one in 00142, and
-- the two will drift. 00142 is the source of truth; if the validation rules
-- change there, mirror them here or this repair becomes wrong.

-- ── 1. Remove the provider-domain allowlist function ───────────────────────
-- 00142 already drops this, so on a fully-migrated database it is absent and
-- this is a no-op. It matters for a database that applied 00112 but not 00142,
-- where the function and the EXECUTE grant 00143 revokes still exist. Dropping
-- the function drops the grant with it.
drop function if exists public.is_allowed_gif_host(text, text);

-- ── 2. Delete leftover GIF attachment rows ─────────────────────────────────
-- Required, not cosmetic: the type CHECK is tightened in step 5, and a CHECK
-- is validated against existing rows, so a single type='gif' row would abort
-- the ALTER. These rows are unusable anyway -- the type union no longer
-- contains 'gif' and the app's image MIME allowlist no longer contains
-- 'image/gif', so nothing can render them. Counted and raised so the deletion
-- is never silent. Zero on the hosted project.
do $$
declare
  v_gif_rows bigint;
begin
  select count(*) into v_gif_rows
  from public.chat_message_attachments
  where type = 'gif';

  if v_gif_rows > 0 then
    raise notice 'removing % chat attachment row(s) of type gif', v_gif_rows;
    delete from public.chat_message_attachments where type = 'gif';
  end if;
end;
$$;

-- ── 3. Repair the live validation trigger ──────────────────────────────────
-- THE FIX. This is the object that still referenced a GIF provider. The body
-- below is byte-identical to 00142's, which differs from the deployed body by
-- exactly one entry in v_is_image.
--
-- create or replace keeps the function OID, so trg_validate_chat_attachment_fields
-- stays bound to the table across this change and no trigger needs recreating.
-- Idempotent: on a fresh replay this replaces the function with an identical
-- definition.
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

    v_is_image := v_mime in ('image/jpeg','image/png','image/webp','image/heic','image/heif');
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
$$;

-- ── 4. Drop every CHECK constraint whose definition still mentions GIF ─────
-- Matched on definition, not name, on purpose. 00110 declared the type CHECK
-- inline (`type text not null check (...)`), so its name is Postgres-generated;
-- dropping by name would depend on that generated name staying stable across
-- versions, whereas matching the definition cannot miss a GIF-bearing
-- constraint whatever it is called. No-op on the hosted project, where
-- remove_gif_attachments had already done this.
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.chat_message_attachments'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%gif%'
  loop
    raise notice 'dropping GIF-bearing constraint %', r.conname;
    execute format(
      'alter table public.chat_message_attachments drop constraint %I',
      r.conname
    );
  end loop;
end;
$$;

-- ── 5. Re-add both constraints without GIF ────────────────────────────────
-- Copied verbatim from 00110 as corrected, so a database that replays from
-- empty and one repaired here end up identical. The type constraint is dropped
-- first (by its generated name) so re-adding is idempotent rather than stacking
-- a duplicate. No-op on the hosted project.
alter table public.chat_message_attachments
  drop constraint if exists chat_message_attachments_type_check;

alter table public.chat_message_attachments
  add constraint chat_message_attachments_type_check
  check (type in ('image','file','audio','sticker'));

alter table public.chat_message_attachments
  drop constraint if exists chat_attachments_storage_check;

alter table public.chat_message_attachments
  add constraint chat_attachments_storage_check check (
    (type in ('image','file','audio') and storage_path is not null)
    or (type = 'sticker')
  );
