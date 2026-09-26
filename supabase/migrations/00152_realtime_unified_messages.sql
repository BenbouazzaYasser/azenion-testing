-- Migration: 00152_realtime_unified_messages
--
-- Canonical realtime message store:
--   * messages accepts exactly one target: conversation_id OR channel_id
--   * direct/group conversation metadata is explicit
--   * channel_messages and chat_message_attachments remain read-compatible
--     projections while the Next.js clients migrate to Phoenix
--   * old send/edit/delete RPCs write the canonical table first
--   * message and membership RLS is re-derived from those two targets, and the
--     functions/tables this migration touches are re-granted to authenticated
--     and service_role only (Postgres gives EXECUTE to PUBLIC by default, and
--     `create or replace` keeps whatever privileges a function already had)
--
-- Realtime broadcasts are not persisted here: Phoenix broadcasts first and the
-- supervised batcher performs the idempotent insert represented by this schema.

-- ââ 1. Direct/group conversations âââââââââââââââââââââââââââââââââââââââââââ

alter table public.conversations
  add column if not exists type text,
  add column if not exists name text;

update public.conversations
set type = case
      when member_a is not null and member_b is not null then 'direct'
      else 'group'
    end,
    name = case
      when member_a is not null and member_b is not null then name
      else coalesce(nullif(btrim(name), ''), 'Group conversation')
    end
where type is null or (type = 'group' and nullif(btrim(name), '') is null);

alter table public.conversations alter column type set default 'direct';
alter table public.conversations alter column type set not null;

-- Added NOT VALID then validated separately: the scan runs under SHARE UPDATE
-- EXCLUSIVE so readers and writers keep flowing while it happens.
alter table public.conversations drop constraint if exists conversations_type_check;
alter table public.conversations
  add constraint conversations_type_check check (type in ('direct', 'group')) not valid;
alter table public.conversations validate constraint conversations_type_check;

alter table public.conversations drop constraint if exists conversations_group_name_check;
alter table public.conversations
  add constraint conversations_group_name_check check (type = 'direct' or name is not null) not valid;
alter table public.conversations validate constraint conversations_group_name_check;

comment on column public.conversations.type is
  'Conversation kind: direct (exactly one pair) or group.';
comment on column public.conversations.name is
  'Required display name for group conversations; null for direct conversations.';

-- Only direct conversations have the canonical member pair. In particular, a
-- two-person group must not claim the unique direct-pair slot.
create or replace function public.sync_conversation_member_pair()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_a uuid;
  v_b uuid;
  v_count integer;
  v_type text;
begin
  select count(*), min(user_id::text)::uuid, max(user_id::text)::uuid
  into v_count, v_a, v_b
  from public.conversation_members
  where conversation_id = NEW.conversation_id;

  select type into v_type
  from public.conversations
  where id = NEW.conversation_id;

  if v_type = 'direct' and v_count = 2 then
    update public.conversations
    set member_a = v_a, member_b = v_b
    where id = NEW.conversation_id;
  end if;

  return NEW;
end;
$$;

drop trigger if exists sync_conversation_member_pair on public.conversation_members;
create trigger sync_conversation_member_pair
  after insert on public.conversation_members
  for each row execute function public.sync_conversation_member_pair();

create index if not exists idx_conversations_type_updated
  on public.conversations(type, updated_at desc);

-- Membership is the root of every message authorization check (messages RLS,
-- get_or_create_conversation, send_chat_message, and the Phoenix join queries
-- all key off is_conversation_member). 00024 still allowed *any* authenticated
-- caller to insert a membership row for *any* user into *any* conversation
-- ("system can add members"), which would let a caller add itself to somebody
-- else's conversation and then read it. No client writes memberships directly:
-- get_or_create_conversation and create_group_conversation are SECURITY
-- DEFINER and bypass RLS, so the table only needs read access for clients.
drop policy if exists "system can add members" on public.conversation_members;
revoke insert, delete on public.conversation_members from anon, authenticated;

-- ââ 2. Canonical messages âââââââââââââââââââââââââââââââââââââââââââââââââââ

alter table public.messages
  add column if not exists channel_id uuid references public.channels(id) on delete cascade,
  add column if not exists message_type text not null default 'text',
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists attachments jsonb not null default '[]'::jsonb;

alter table public.messages alter column conversation_id drop not null;

update public.messages
set attachments = '[]'::jsonb
where attachments is null;

update public.messages
set metadata = '{}'::jsonb
where metadata is null;

alter table public.messages alter column attachments set not null;
alter table public.messages alter column metadata set not null;

-- Backfill the compatibility table before it becomes a projection.
insert into public.messages (
  id,
  channel_id,
  sender_id,
  content,
  image_url,
  created_at,
  edited_at,
  message_type,
  metadata,
  attachments
)
select
  cm.id,
  cm.channel_id,
  cm.sender_id,
  cm.content,
  cm.image_url,
  cm.created_at,
  cm.edited_at,
  'text',
  '{}'::jsonb,
  '[]'::jsonb
from public.channel_messages cm
on conflict (id) do nothing;

alter table public.messages drop constraint if exists messages_target_check;
alter table public.messages
  add constraint messages_target_check check (
    (conversation_id is not null and channel_id is null)
    or (conversation_id is null and channel_id is not null)
  ) not valid;
alter table public.messages validate constraint messages_target_check;

alter table public.messages drop constraint if exists messages_attachments_array_check;
alter table public.messages
  add constraint messages_attachments_array_check check (jsonb_typeof(attachments) = 'array') not valid;
alter table public.messages validate constraint messages_attachments_array_check;

alter table public.messages drop constraint if exists messages_attachments_max_check;
alter table public.messages
  add constraint messages_attachments_max_check check (jsonb_array_length(attachments) <= 10) not valid;
alter table public.messages validate constraint messages_attachments_max_check;

comment on table public.messages is
  'Canonical realtime messages. Exactly one of conversation_id or channel_id is set.';
comment on column public.messages.attachments is
  'Canonical attachment descriptors; projected to chat_message_attachments for compatibility.';

create index if not exists idx_messages_conversation_bucket
  on public.messages(conversation_id, created_at desc, id desc)
  where conversation_id is not null;
create index if not exists idx_messages_channel_bucket
  on public.messages(channel_id, created_at desc, id desc)
  where channel_id is not null;
create index if not exists idx_messages_sender
  on public.messages(sender_id);

-- 00047's bump trigger only ever worked for INSERT: it dereferenced NEW on
-- every row kind, so a DELETE raised "record new is not assigned yet", and it
-- updates conversations by NEW.conversation_id, which is now NULL for channel
-- rows. Re-define it so both row kinds and both target kinds are correct.
create or replace function public.bump_conversation_updated_at()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_conversation_id uuid;
begin
  v_conversation_id :=
    case when tg_op = 'DELETE' then old.conversation_id else new.conversation_id end;

  if v_conversation_id is not null then
    update public.conversations
    set updated_at = now()
    where id = v_conversation_id;
  end if;

  -- AFTER trigger: the return value is ignored, NULL keeps both row kinds legal.
  return null;
end;
$$;

-- Target changes would make old projections and attachment ownership ambiguous.
create or replace function public.prevent_message_target_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.conversation_id is distinct from old.conversation_id
    or new.channel_id is distinct from old.channel_id then
    raise exception 'Message target cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_message_target_change on public.messages;
create trigger trg_prevent_message_target_change
  before update of conversation_id, channel_id on public.messages
  for each row execute function public.prevent_message_target_change();

-- ââ 3. Unified-message RLS ââââââââââââââââââââââââââââââââââââââââââââââââââ

drop policy if exists "members can read messages" on public.messages;
create policy "members can read messages"
  on public.messages for select
  using (
    (conversation_id is not null and public.is_conversation_member(conversation_id))
    or (channel_id is not null and public.can_access_channel(channel_id))
  );

drop policy if exists "members can send messages" on public.messages;
create policy "members can send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and (
      (conversation_id is not null and public.is_conversation_member(conversation_id))
      or (channel_id is not null and public.can_access_channel(channel_id))
    )
    and not (
      conversation_id is not null
      and public.is_blocked_by_conversation_peer(conversation_id, auth.uid())
    )
  );

drop policy if exists "senders can edit their own messages" on public.messages;
create policy "senders can edit their own messages"
  on public.messages for update
  using (
    sender_id = auth.uid()
    and (
      (conversation_id is not null and public.is_conversation_member(conversation_id))
      or (channel_id is not null and public.can_access_channel(channel_id))
    )
  )
  with check (
    sender_id = auth.uid()
    and (
      (conversation_id is not null and public.is_conversation_member(conversation_id))
      or (channel_id is not null and public.can_access_channel(channel_id))
    )
  );

drop policy if exists "senders can delete their own messages" on public.messages;
create policy "senders can delete their own messages"
  on public.messages for delete
  using (
    sender_id = auth.uid()
    and (
      (conversation_id is not null and public.is_conversation_member(conversation_id))
      or (channel_id is not null and public.can_access_channel(channel_id))
    )
  );

-- ââ 4. Group-conversation creation RPC ââââââââââââââââââââââââââââââââââââââ

create or replace function public.create_group_conversation(
  p_name text,
  p_member_ids uuid[]
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_conversation_id uuid;
  v_member_ids uuid[] := '{}'::uuid[];
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_name is null or length(btrim(p_name)) < 2 or length(btrim(p_name)) > 80 then
    raise exception 'Group name must be between 2 and 80 characters';
  end if;
  if p_member_ids is null then
    raise exception 'At least one other member is required';
  end if;
  -- Bound the unnest/aggregate work so a caller cannot push an unbounded array
  -- through a SECURITY DEFINER function.
  if cardinality(p_member_ids) > 50 then
    raise exception 'Too many members. Max 50 per group.';
  end if;

  select coalesce(array_agg(distinct candidate_id), '{}'::uuid[])
  into v_member_ids
  from unnest(p_member_ids) as candidate_id
  where candidate_id <> v_uid
    and exists (select 1 from public.profiles where id = candidate_id);

  if cardinality(v_member_ids) = 0 then
    raise exception 'At least one valid member is required';
  end if;

  if exists (
    select 1
    from unnest(v_member_ids) as member_id
    where public.is_user_blocked(member_id, v_uid)
       or public.is_user_blocked(v_uid, member_id)
  ) then
    raise exception 'One or more members have blocked this user';
  end if;

  insert into public.conversations (type, name)
  values ('group', btrim(p_name))
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id)
  select v_conversation_id, member_id
  from unnest(v_member_ids) as member_id
  union all
  select v_conversation_id, v_uid;

  return v_conversation_id;
end;
$$;

grant execute on function public.create_group_conversation(text, uuid[])
  to authenticated, service_role;
revoke execute on function public.create_group_conversation(text, uuid[])
  from public, anon;

-- ââ 5. channel_messages compatibility projection âââââââââââââââââââââââââââ

create or replace function public.project_message_to_channel_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    delete from public.channel_messages where id = OLD.id;
    return OLD;
  end if;

  if NEW.channel_id is not null then
    if TG_OP = 'INSERT' then
      insert into public.channel_messages (
        id, channel_id, sender_id, content, image_url, created_at, edited_at
      )
      values (
        NEW.id, NEW.channel_id, NEW.sender_id, NEW.content,
        NEW.image_url, NEW.created_at, NEW.edited_at
      )
      on conflict (id) do nothing;
    else
      update public.channel_messages
      set channel_id = NEW.channel_id,
          sender_id = NEW.sender_id,
          content = NEW.content,
          image_url = NEW.image_url,
          created_at = NEW.created_at,
          edited_at = NEW.edited_at
      where id = NEW.id;
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_project_message_to_channel_message on public.messages;
create trigger trg_project_message_to_channel_message
  after insert or update or delete on public.messages
  for each row execute function public.project_message_to_channel_message();

-- ââ 6. chat_message_attachments compatibility projection ââââââââââââââââââââ

create or replace function public.project_message_attachments()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if NEW.conversation_id is not null and jsonb_array_length(NEW.attachments) > 0 then
    insert into public.chat_message_attachments (
      message_id, conversation_id, uploader_id, type, storage_path, filename,
      mime_type, file_size, duration_seconds, provider, external_id, metadata
    )
    select
      NEW.id,
      NEW.conversation_id,
      NEW.sender_id,
      attachment ->> 'type',
      attachment ->> 'storage_path',
      attachment ->> 'filename',
      attachment ->> 'mime_type',
      (attachment ->> 'file_size')::integer,
      (attachment ->> 'duration_seconds')::integer,
      attachment ->> 'provider',
      attachment ->> 'external_id',
      coalesce(nullif(attachment -> 'metadata', 'null'::jsonb), '{}'::jsonb)
    from jsonb_array_elements(NEW.attachments) as attachment;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_project_message_attachments on public.messages;
create trigger trg_project_message_attachments
  after insert on public.messages
  for each row execute function public.project_message_attachments();

-- Existing attachment rows become canonical JSON. The trigger keeps the two
-- representations synchronized while old Server Actions still insert rows.
update public.messages m
set attachments = coalesce((
  select jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'type', a.type,
      'storage_path', a.storage_path,
      'filename', a.filename,
      'mime_type', a.mime_type,
      'file_size', a.file_size,
      'duration_seconds', a.duration_seconds,
      'provider', a.provider,
      'external_id', a.external_id,
      'metadata', a.metadata
    )
    order by a.created_at, a.id
  )
  from public.chat_message_attachments a
  where a.message_id = m.id
), '[]'::jsonb)
where exists (
  select 1 from public.chat_message_attachments a where a.message_id = m.id
);

create or replace function public.sync_message_attachments_from_rows()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_old_message_id uuid;
  v_new_message_id uuid;
begin
  -- Depth > 1 means this row change was caused by a trigger on `messages`
  -- itself: the canonical->projection insert in project_message_attachments,
  -- or the ON DELETE CASCADE that fires while a message is being deleted.
  -- Both paths already own `messages.attachments` (the parent command is
  -- inserting them, or the parent row is going away), so re-aggregating here
  -- would either write a row owned by the running command or lose the race
  -- against the delete. Standalone attachment writes arrive at depth 1.
  if pg_trigger_depth() > 1 then
    if TG_OP = 'DELETE' then
      return OLD;
    end if;
    return NEW;
  end if;

  if TG_OP <> 'INSERT' then
    v_old_message_id := OLD.message_id;
  end if;
  if TG_OP <> 'DELETE' then
    v_new_message_id := NEW.message_id;
  end if;

  if v_old_message_id is not null then
    update public.messages m
    set attachments = coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'type', a.type,
          'storage_path', a.storage_path,
          'filename', a.filename,
          'mime_type', a.mime_type,
          'file_size', a.file_size,
          'duration_seconds', a.duration_seconds,
          'provider', a.provider,
          'external_id', a.external_id,
          'metadata', a.metadata
        )
        order by a.created_at, a.id
      )
      from public.chat_message_attachments a
      where a.message_id = v_old_message_id
    ), '[]'::jsonb)
    where m.id = v_old_message_id;
  end if;

  if v_new_message_id is not null and v_new_message_id is distinct from v_old_message_id then
    update public.messages m
    set attachments = coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'type', a.type,
          'storage_path', a.storage_path,
          'filename', a.filename,
          'mime_type', a.mime_type,
          'file_size', a.file_size,
          'duration_seconds', a.duration_seconds,
          'provider', a.provider,
          'external_id', a.external_id,
          'metadata', a.metadata
        )
        order by a.created_at, a.id
      )
      from public.chat_message_attachments a
      where a.message_id = v_new_message_id
    ), '[]'::jsonb)
    where m.id = v_new_message_id;
  end if;

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_sync_message_attachments_from_rows
  on public.chat_message_attachments;
create trigger trg_sync_message_attachments_from_rows
  after insert or update or delete on public.chat_message_attachments
  for each row execute function public.sync_message_attachments_from_rows();

-- ââ 7. Existing RPCs now write canonical messages âââââââââââââââââââââââââââ

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
  v_content text := coalesce(trim(p_content), '');
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_conversation_member(p_conversation_id, v_uid) then
    raise exception 'You are not a member of this conversation.';
  end if;

  -- Check every other participant, not just one row: this RPC is SECURITY
  -- DEFINER, so a single-peer check would let a group member message a
  -- conversation where somebody *else* blocked them. Mirrors the
  -- is_blocked_by_conversation_peer() guard in the messages INSERT policy.
  if exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id <> v_uid
      and public.is_user_blocked(cm.user_id, v_uid)
  ) then
    raise exception 'You can''t send messages in this conversation because a participant blocked you.';
  end if;
  if v_content = '' and v_att_count = 0 then
    raise exception 'Message cannot be empty';
  end if;
  if v_att_count > 10 then
    raise exception 'Too many attachments. Max 10 per message.';
  end if;

  insert into public.messages (
    conversation_id, sender_id, content, attachments
  )
  values (
    p_conversation_id, v_uid, v_content, coalesce(p_attachments, '[]'::jsonb)
  )
  returning messages.id, messages.created_at into v_msg_id, v_msg_created;

  return query select v_msg_id, v_msg_created;
end;
$$;

create or replace function public.send_channel_message(
  p_channel_id uuid,
  p_content text
)
returns table (id uuid, created_at timestamptz)
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_content text := coalesce(trim(p_content), '');
  v_id uuid;
  v_created_at timestamptz;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if v_content = '' then
    raise exception 'Message cannot be empty';
  end if;
  if char_length(v_content) > 4000 then
    raise exception 'Message is too long (max 4000 characters).';
  end if;
  if not public.can_access_channel(p_channel_id, v_uid) then
    raise exception 'You are not a member of this channel.';
  end if;

  insert into public.messages (channel_id, sender_id, content)
  values (p_channel_id, v_uid, v_content)
  returning messages.id, messages.created_at into v_id, v_created_at;

  return query select v_id, v_created_at;
end;
$$;

create or replace function public.edit_channel_message(
  p_message_id uuid,
  p_content text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_content text := coalesce(trim(p_content), '');
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if v_content = '' then raise exception 'Message cannot be empty'; end if;
  if char_length(v_content) > 4000 then
    raise exception 'Message is too long (max 4000 characters).';
  end if;

  update public.messages
  set content = v_content, edited_at = now()
  where id = p_message_id
    and channel_id is not null
    and sender_id = v_uid
    and public.can_access_channel(channel_id, v_uid);
  if not found then raise exception 'Message not found or not editable'; end if;
end;
$$;

create or replace function public.delete_channel_message(p_message_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  delete from public.messages
  where id = p_message_id
    and channel_id is not null
    and sender_id = v_uid
    and public.can_access_channel(channel_id, v_uid);
  if not found then raise exception 'Message not found or not deletable'; end if;
end;
$$;

-- ââ 8. Keep existing direct-message UI semantics ââââââââââââââââââââââââââââ

create or replace function public.get_unread_counts(p_user_id uuid)
returns table (conversation_id uuid, unread_count bigint)
language sql
stable
security definer set search_path = public
as $$
  select cm.conversation_id, cm.unread_count::bigint
  from public.conversation_members cm
  join public.conversations c on c.id = cm.conversation_id
  where cm.user_id = p_user_id
    -- The counters are the caller's own, so pin the argument to the caller
    -- (the function is SECURITY DEFINER and would otherwise answer for anyone).
    and (auth.uid() = p_user_id or auth.role() = 'service_role')
    and c.type = 'direct'
    and cm.archived_at is null
    and cm.deleted_at is null
    and cm.unread_count > 0;
$$;

create or replace function public.get_inbox(p_archived boolean default false)
returns table (
  conversation_id uuid,
  updated_at timestamptz,
  peer_id uuid,
  peer_full_name text,
  peer_username text,
  peer_avatar_url text,
  peer_last_read_at timestamptz,
  last_message_id uuid,
  last_message_content text,
  last_message_at timestamptz,
  last_message_sender_id uuid,
  last_message_received_at timestamptz,
  last_message_has_attachments boolean,
  unread_count integer,
  blocked_me boolean,
  i_blocked boolean
)
language sql
stable
security definer set search_path = public
as $$
  with mine as (
    select cm.conversation_id, cm.last_read_at, cm.unread_count
    from public.conversation_members cm
    where cm.user_id = auth.uid()
      and case when p_archived
        then cm.archived_at is not null
        else cm.archived_at is null end
      and cm.deleted_at is null
  )
  select
    c.id,
    c.updated_at,
    pp.id,
    pp.full_name,
    pp.username,
    pp.avatar_url,
    pm.last_read_at,
    lm.id,
    lm.content,
    lm.created_at,
    lm.sender_id,
    lm.received_at,
    coalesce(lm.attachments, '[]'::jsonb) <> '[]'::jsonb,
    mine.unread_count,
    exists (
      select 1 from public.user_blocks b
      where b.blocker_id = pp.id and b.blocked_id = auth.uid()
    ),
    exists (
      select 1 from public.user_blocks b
      where b.blocker_id = auth.uid() and b.blocked_id = pp.id
    )
  from mine
  join public.conversations c on c.id = mine.conversation_id and c.type = 'direct'
  left join lateral (
    select cm.user_id, cm.last_read_at
    from public.conversation_members cm
    where cm.conversation_id = mine.conversation_id
      and cm.user_id <> auth.uid()
    limit 1
  ) pm on true
  left join public.profiles pp on pp.id = pm.user_id
  left join lateral (
    select m.id, m.content, m.created_at, m.sender_id, m.received_at, m.attachments
    from public.messages m
    where m.conversation_id = mine.conversation_id
    order by m.created_at desc, m.id desc
    limit 1
  ) lm on true
  order by c.updated_at desc;
$$;

-- ââ 9. Realtime/grants âââââââââââââââââââââââââââââââââââââââââââââââââââââ

alter table public.messages replica identity full;

-- Postgres grants EXECUTE to PUBLIC on every function by default, and
-- `create or replace` keeps whatever privileges the function already had, so
-- every function this migration touches (created or rewritten) is revoked from
-- PUBLIC/anon and re-granted to the two legitimate callers. Helpers used by
-- the messages RLS policies are included: they are SECURITY DEFINER and must
-- only be reachable through a policy, never called directly with an arbitrary
-- p_user_id.
do $$
declare
  sig text;
begin
  for sig in
    select n.nspname || '.' || p.oid::regprocedure::text
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'create_group_conversation', 'send_chat_message', 'send_channel_message',
        'edit_channel_message', 'delete_channel_message', 'get_unread_counts',
        'get_inbox', 'is_conversation_member', 'is_user_blocked',
        'is_blocked_by_conversation_peer', 'can_access_channel',
        'get_or_create_conversation'
      )
  loop
    execute format('grant execute on function %s to authenticated, service_role', sig);
    execute format('revoke execute on function %s from public, anon', sig);
  end loop;
end;
$$;

grant select, insert, update, delete on public.messages to authenticated, service_role;
revoke select, insert, update, delete on public.messages from public, anon;

-- 00110 granted anon SELECT on chat_message_attachments, but 00142 already
-- revoked is_conversation_member() from anon, so that policy can never succeed
-- for an anonymous caller: it can only ever error. Attachments are private
-- conversation data, so drop the dead grant instead of leaving a broken one.
revoke select on public.chat_message_attachments from anon;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
exception when others then
  null;
end;
$$;
