-- 00152_realtime_unified_messages.sql object assertions.
--
-- Run by .github/workflows/chat-attachment-migration.yml against a LOCAL
-- Supabase after `supabase db reset`, via:
--   psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f supabase/tests/realtime-unified-objects.sql
--
-- Every expectation below is extracted from 00152, not invented. The function
-- signatures are its `create or replace function` argument lists; the trigger
-- names and relations are its five drop/create pairs; the index names and
-- tables are its four `create index` statements; the two column expectations are
-- its `alter table public.conversations add column` clause, which declares
-- plain nullable `text` with no default and nothing else.
--
-- Why only five of the thirteen functions: 00152 redefines eight that already
-- existed (bump_conversation_updated_at, get_inbox, get_unread_counts,
-- send_channel_message, edit_channel_message, delete_channel_message,
-- send_chat_message, sync_conversation_member_pair). Those would still be
-- present if 00152 were deleted outright, so asserting them proves nothing.
-- The five asserted here are named only by 00152, so they can only exist if it
-- ran. This is a presence gate, not a body gate: it cannot tell 00152's version
-- of a redefined function from its predecessor's.
--
-- The triggers are worth asserting even though two of them predate 00152,
-- because 00152 drops each one immediately before recreating it. A failed
-- CREATE therefore leaves the trigger absent rather than stale, and the drop
-- would have already succeeded.
--
-- Every failure path raises, so ON_ERROR_STOP makes psql exit non-zero and fail
-- the step. Production is never touched.

do $$
declare
  v_fn   text;
  v_pair text;
  v_name text;
  v_rel  text;
  v_typ  text;
  v_nul  text;
  v_def  text;
begin
  -- 1. The five functions 00152 introduces.
  foreach v_fn in array array[
    'public.create_group_conversation(text,uuid[])',
    'public.prevent_message_target_change()',
    'public.project_message_attachments()',
    'public.project_message_to_channel_message()',
    'public.sync_message_attachments_from_rows()'
  ] loop
    if to_regprocedure(v_fn) is null then
      raise exception '00152: function % is missing', v_fn;
    end if;
  end loop;

  -- 2. The five triggers, each on the relation 00152 names.
  foreach v_pair in array array[
    'sync_conversation_member_pair conversation_members',
    'trg_prevent_message_target_change messages',
    'trg_project_message_to_channel_message messages',
    'trg_project_message_attachments messages',
    'trg_sync_message_attachments_from_rows chat_message_attachments'
  ] loop
    v_name := split_part(v_pair, ' ', 1);
    v_rel  := split_part(v_pair, ' ', 2);

    if not exists (
      select 1
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = v_rel
        and t.tgname = v_name
        and not t.tgisinternal
    ) then
      raise exception
        '00152: trigger % is not attached to public.%', v_name, v_rel;
    end if;
  end loop;

  -- 3. The four indexes, each on the table 00152 names.
  foreach v_pair in array array[
    'idx_conversations_type_updated conversations',
    'idx_messages_conversation_bucket messages',
    'idx_messages_channel_bucket messages',
    'idx_messages_sender messages'
  ] loop
    v_name := split_part(v_pair, ' ', 1);
    v_rel  := split_part(v_pair, ' ', 2);

    if not exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and indexname = v_name
        and tablename = v_rel
    ) then
      raise exception
        '00152: index % does not exist on public.%', v_name, v_rel;
    end if;
  end loop;

  -- 4. The two columns 00152 adds. `add column if not exists type text` and
  --    `add column if not exists name text` declare no NOT NULL and no DEFAULT,
  --    so both must be nullable text with a null default. The type check is the
  --    one that bites: a future `add column if not exists` would silently accept
  --    an already-existing column of the wrong type.
  foreach v_name in array array['type', 'name'] loop
    select data_type, is_nullable, column_default
      into v_typ, v_nul, v_def
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'conversations'
      and column_name = v_name;

    if v_typ is null then
      raise exception
        '00152: public.conversations.% does not exist', v_name;
    end if;

    if v_typ <> 'text' then
      raise exception
        '00152: public.conversations.% is %, expected text', v_name, v_typ;
    end if;

    if v_nul <> 'YES' then
      raise exception
        '00152: public.conversations.% is NOT NULL, 00152 declares it nullable',
        v_name;
    end if;

    if v_def is not null then
      raise exception
        '00152: public.conversations.% has default %, 00152 declares none',
        v_name, v_def;
    end if;
  end loop;
end
$$;
