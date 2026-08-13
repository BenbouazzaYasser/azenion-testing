-- Migration: 00069_chat_conversation_options
--
-- Adds per-user conversation options: archive + soft delete.
--
-- State lives on the caller's own conversation_members row, so one participant
-- can archive/delete their *view* of a conversation without affecting the other
-- participant or destroying the shared conversation/messages.
--
-- Security:
--   * The existing UPDATE policy from 00067 ("members can update their own
--     membership", using/with-check user_id = auth.uid()) already restricts
--     writes to the caller's own row, so archived_at/deleted_at can only ever
--     be set by the member themselves. No new policies are required.
--   * SELECT policies still route through is_conversation_member(), so an
--     archived/deleted member keeps read access to their messages and the
--     conversation can be restored later (the Archived section will re-list
--     archived rows via getConversations(..., { archived: true })).

-- ── 1. Per-member archive + soft-delete columns ──────────────────────────────
alter table public.conversation_members
  add column if not exists archived_at timestamptz,
  add column if not exists deleted_at timestamptz;

create index if not exists idx_conversation_members_user_state
  on public.conversation_members (user_id, archived_at, deleted_at);

comment on column public.conversation_members.archived_at is
  'When set, this member hides the conversation from their active list.';
comment on column public.conversation_members.deleted_at is
  'When set, this member soft-deletes the conversation from their list.';

-- ── 2. Unread counts skip archived/deleted conversations ─────────────────────
-- Archived/deleted conversations should not keep producing unread badges in
-- the sidebar or the navbar indicator.
create or replace function public.get_unread_counts(p_user_id uuid)
returns table (conversation_id uuid, unread_count bigint)
language sql
stable
security definer set search_path = public
as $$
  select m.conversation_id, count(*)::bigint as unread_count
  from public.messages m
  join public.conversation_members cm
    on cm.conversation_id = m.conversation_id
  where cm.user_id = p_user_id
    and cm.archived_at is null
    and cm.deleted_at is null
    and m.sender_id <> p_user_id
    and m.created_at > coalesce(cm.last_read_at, '1970-01-01'::timestamptz)
  group by m.conversation_id;
$$;
