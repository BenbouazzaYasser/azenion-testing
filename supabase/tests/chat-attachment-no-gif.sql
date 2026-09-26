-- Chat attachment schema: no-GIF invariant.
--
-- Run by .github/workflows/chat-attachment-migration.yml against a LOCAL
-- Supabase after `supabase db reset`, via:
--   psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f supabase/tests/chat-attachment-no-gif.sql
--
-- Every failure path raises, so ON_ERROR_STOP makes psql exit non-zero and
-- fail the step. Production is never touched.
--
-- GIF support (Giphy/Tenor provider-backed attachments) was removed from the
-- chat attachment domain. What remains:
--
--   type       image | file | audio | sticker
--   provider   'local' for sticker, null otherwise
--   image MIME jpeg, png, webp, heic, heif  (no image/gif)
--
-- These are catalog assertions on purpose. chat_message_attachments has two
-- BEFORE INSERT triggers, fired in alphabetical order:
--
--   trg_validate_chat_attachment_conversation   (00110)
--   trg_validate_chat_attachment_fields          (00111)
--
-- so the conversation check fires first and masks the field validation, and
-- FK constraints fire last of all. Reaching the sticker branch by INSERT would
-- need a real auth.users -> profiles -> conversations -> messages seed.
-- Reading the catalog asserts the same invariant with no seed and no ordering
-- assumptions.

do $$
declare
  v_checks text;
  v_body   text;
  v_type   text;
begin
  -- 1. No CHECK constraint on the table may mention gif.
  select string_agg(pg_get_constraintdef(oid), ' | ') into v_checks
  from pg_constraint
  where conrelid = 'public.chat_message_attachments'::regclass
    and contype = 'c';

  if v_checks is null then
    raise exception 'no CHECK constraints found on chat_message_attachments';
  end if;

  if v_checks ilike '%gif%' then
    raise exception
      'chat_message_attachments CHECK still references gif: %', v_checks;
  end if;

  -- The four types we expect. Catches an over-tightened constraint that
  -- dropped sticker or audio while removing gif.
  foreach v_type in array array['image', 'file', 'audio', 'sticker'] loop
    if position(v_type in v_checks) = 0 then
      raise exception
        'chat_message_attachments CHECK lost type %: %', v_type, v_checks;
    end if;
  end loop;

  -- 2. The Giphy/Tenor host helper must be gone.
  if to_regprocedure('public.is_allowed_gif_host(text,text)') is not null then
    raise exception 'public.is_allowed_gif_host(text,text) still exists';
  end if;

  -- 3. The live trigger body must be GIF-free. This is the function 00142
  --    rewrote, so it is the code most at risk of a partial deletion. Its
  --    `elsif NEW.type = 'sticker'` branch sits behind the conversation
  --    trigger, so asserting on the source is the honest way to pin it.
  select p.prosrc into v_body
  from pg_proc p
  where p.oid = to_regprocedure('public.validate_chat_attachment_fields()');

  if v_body is null then
    raise exception 'public.validate_chat_attachment_fields() not found';
  end if;

  if v_body ilike '%gif%'
     or v_body ilike '%giphy%'
     or v_body ilike '%tenor%' then
    raise exception
      'validate_chat_attachment_fields() still references a GIF provider';
  end if;

  -- 4. image/gif must be gone from the DB-side MIME allowlist.
  if v_body ilike '%image/gif%' then
    raise exception
      'validate_chat_attachment_fields() still allows image/gif';
  end if;

  -- 5. The sticker branch must survive the elsif collapse: still requires a
  --    provider, and only 'local' is accepted.
  if position('sticker' in v_body) = 0
     or position('local' in v_body) = 0 then
    raise exception
      'sticker branch looks gutted in validate_chat_attachment_fields()';
  end if;
end
$$;

-- 6. The validation trigger is still attached to the table. 00142 replaced the
--    function; if a later migration dropped or renamed the trigger, the checks
--    above would pass while enforcement silently did nothing.
do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    where c.relname = 'chat_message_attachments'
      and t.tgname = 'trg_validate_chat_attachment_fields'
      and not t.tgisinternal
  ) then
    raise exception
      'trg_validate_chat_attachment_fields is no longer attached';
  end if;
end
$$;
