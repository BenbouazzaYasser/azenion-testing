-- Migration: 00148_chat_perf
--
-- Chat read-path performance: the sidebar previously needed ~9 sequential
-- round trips (memberships, conversations, members, profiles-via-admin,
-- last-message RPC, attachment flags, unread scan, two block lookups) and the
-- thread open needed 3 more (read receipt, received receipt, peer read-at).
-- This migration collapses them server-side:
--
--   1. conversation_members.unread_count: trigger-maintained counter, so the
--      sidebar/navbar never scan messages for unread state. Incremented on
--      message insert (all members except the sender), zeroed on read/archive.
--   2. get_unread_counts rewritten to read the counter (one indexed lookup;
--      existing callers in actions + realtime bootstrap get faster untouched).
--   3. get_inbox: ONE rpc returning the full sidebar row (peer profile, last
--      message + attachment flag, unread, both block directions). SECURITY
--      DEFINER scoped to the caller's own memberships; anon/public revoked.
--   4. mark_thread_read: ONE rpc for opening a thread (last_read_at +
--      unread reset + received receipts) returning the peer's last_read_at.
--
-- Security: new functions grant execute to authenticated + service_role only,
-- matching 00143/00145. The definer functions read profiles/user_blocks
-- directly but only for conversations the caller belongs to (mine CTE).

-- ── 1. Denormalized unread counter ──────────────────────────────────────────
alter table public.conversation_members
  add column if not exists unread_count integer not null default 0;

comment on column public.conversation_members.unread_count is
  'Trigger-maintained unread badge count (messages from others since last read). Zeroed by mark_thread_read.';

create or replace function public.bump_member_unread_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.conversation_members
  set unread_count = unread_count + 1
  where conversation_id = NEW.conversation_id
    and user_id <> NEW.sender_id;
  return NEW;
end;
$$;

drop trigger if exists trg_bump_member_unread_count on public.messages;
create trigger trg_bump_member_unread_count
  after insert on public.messages
  for each row execute function public.bump_member_unread_count();

-- Backfill with the same semantics get_unread_counts used (all members,
-- including archived — the app only displays counts for listed rows).
update public.conversation_members cm
set unread_count = coalesce((
  select count(*)
  from public.messages m
  where m.conversation_id = cm.conversation_id
    and m.sender_id <> cm.user_id
    and m.created_at > coalesce(cm.last_read_at, '1970-01-01'::timestamptz)
), 0);

-- ── 2. Unread counts from the counter ───────────────────────────────────────
create or replace function public.get_unread_counts(p_user_id uuid)
returns table (conversation_id uuid, unread_count bigint)
language sql
stable
security definer set search_path = public
as $$
  select cm.conversation_id, cm.unread_count::bigint
  from public.conversation_members cm
  where cm.user_id = p_user_id
    and cm.archived_at is null
    and cm.deleted_at is null
    and cm.unread_count > 0;
$$;

comment on function public.get_unread_counts(uuid) is
  'Unread badges from the trigger-maintained conversation_members.unread_count (00148). No message scan.';

-- ── 3. Single-RPC inbox ─────────────────────────────────────────────────────
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
    exists (
      select 1 from public.chat_message_attachments a
      where a.message_id = lm.id
    ),
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
  join public.conversations c on c.id = mine.conversation_id
  left join lateral (
    select cm.user_id, cm.last_read_at
    from public.conversation_members cm
    where cm.conversation_id = mine.conversation_id
      and cm.user_id <> auth.uid()
    limit 1
  ) pm on true
  left join public.profiles pp on pp.id = pm.user_id
  left join lateral (
    select m.id, m.content, m.created_at, m.sender_id, m.received_at
    from public.messages m
    where m.conversation_id = mine.conversation_id
    order by m.created_at desc, m.id desc
    limit 1
  ) lm on true
  order by c.updated_at desc;
$$;

grant execute on function public.get_inbox(boolean)
  to authenticated, service_role;
revoke execute on function public.get_inbox(boolean) from anon, public;

comment on function public.get_inbox(boolean) is
  'Full sidebar row per conversation in one round trip (00148). Scoped to the caller''s memberships; RLS bypass is intentional and contained.';

-- ── 4. Merged thread-open receipt ───────────────────────────────────────────
create or replace function public.mark_thread_read(p_conversation_id uuid)
returns table (other_last_read_at timestamptz)
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_conversation_member(p_conversation_id, v_uid) then
    return query select null::timestamptz;
    return;
  end if;

  update public.conversation_members
  set last_read_at = now(), unread_count = 0
  where conversation_id = p_conversation_id
    and user_id = v_uid;

  update public.messages
  set received_at = coalesce(received_at, now())
  where conversation_id = p_conversation_id
    and sender_id <> v_uid
    and received_at is null;

  return query
    select cm.last_read_at
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id <> v_uid
    limit 1;
end;
$$;

grant execute on function public.mark_thread_read(uuid)
  to authenticated, service_role;
revoke execute on function public.mark_thread_read(uuid) from anon, public;

comment on function public.mark_thread_read(uuid) is
  'Thread-open fast path (00148): read receipt + unread reset + received receipts in one write round trip. Returns the peer''s last_read_at.';
