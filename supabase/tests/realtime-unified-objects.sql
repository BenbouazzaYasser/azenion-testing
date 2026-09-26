-- 00152_realtime_unified_messages.sql object assertions.
--
-- Run by .github/workflows/chat-attachment-migration.yml against a LOCAL
-- Supabase after `supabase db reset`, via:
--   psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f supabase/tests/realtime-unified-objects.sql
--
-- Every expectation below is extracted from 00152, not invented. The function
-- signatures are its `create or replace function` argument lists; the trigger
-- names and relations are its five drop/create pairs; the index names and
-- tables are its four `create index` statements; the three column expectations
-- are its two `alter table public.conversations add column` clauses plus its
-- `alter table public.messages add column` clause, each paired with whatever
-- 00152 does to that column afterwards. That last part matters: an
-- `add column` clause is not the end state, and assuming it is produced an
-- expectation that a real replay contradicted for conversations.type.
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
  r      record;
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

  -- 4. The three columns 00152 adds, each with the state 00152 actually leaves
  --    behind -- which is not always the state its `add column` clause declares.
  --
  --    conversations.type   added nullable, then promoted: 00152 runs
  --                         `alter column type set default 'direct'` and
  --                         `set not null` after backfilling it, so the end state
  --                         is NOT NULL with a default.
  --    conversations.name   added and never altered: nullable, no default. The
  --                         `conversations_group_name_check` constraint requires
  --                         it for groups, but the column itself stays nullable
  --                         because direct conversations legitimately have none.
  --    messages.channel_id  added nullable uuid, never altered, no default. It
  --                         is the second half of the exactly-one-of
  --                         conversation_id/channel_id target, enforced by
  --                         messages_target_check rather than by NOT NULL.
  --
  --    Asserting the add-column clause alone would be wrong for `type`: a first
  --    run of this file against a real replay reported it nullable-with-no-
  --    default, which is the state 00152 passes through on its way to NOT NULL.
  for r in
    select * from (values
      ('conversations', 'type',       'text', 'NO',  true),
      ('conversations', 'name',       'text', 'YES', false),
      ('messages',     'channel_id',  'uuid', 'YES', false)
    ) as v(tbl, col, typ, nul, has_def)
  loop
    select data_type, is_nullable, column_default
      into v_typ, v_nul, v_def
    from information_schema.columns
    where table_schema = 'public'
      and table_name = r.tbl
      and column_name = r.col;

    if v_typ is null then
      raise exception '00152: public.%.% does not exist', r.tbl, r.col;
    end if;

    if v_typ <> r.typ then
      raise exception
        '00152: public.%.% is %, expected %', r.tbl, r.col, v_typ, r.typ;
    end if;

    if v_nul <> r.nul then
      raise exception
        '00152: public.%.% is_nullable is %, expected %',
        r.tbl, r.col, v_nul, r.nul;
    end if;

    if r.has_def then
      -- Match the literal rather than the exact cast suffix, which is a
      -- rendering detail: `set default 'direct'` on text reports as
      -- 'direct'::text and that spelling is not worth pinning.
      if v_def is null or v_def not like '%''direct''%' then
        raise exception
          '00152: public.%.% has default %, expected ''direct''', r.tbl, r.col, v_def;
      end if;
    elsif v_def is not null then
      raise exception
        '00152: public.%.% has default %, 00152 declares none', r.tbl, r.col, v_def;
    end if;
  end loop;
end
$$;
