-- Migration: 00067_chat_unread
--
-- Adds per-member read tracking so conversations can show an unread indicator.
-- Each conversation_members row carries a last_read_at timestamp marking the
-- point up to which that member has read the thread. A message counts as
-- unread when it was sent by another member after that timestamp.
--
-- Security follows the model established in 00047_chat_fix.sql:
--   * No self-referential subquery on conversation_members in any policy
--     (that caused the infinite-recursion RLS bug).
--   * The count helper is SECURITY DEFINER so it can read messages/members
--     without triggering member-row RLS recursion.
--   * The UPDATE policy only lets a member modify their OWN membership row,
--     mirroring the "senders can edit their own messages" policy.

-- ── 1. last_read_at column ───────────────────────────────────────────────
alter table public.conversation_members
  add column if not exists last_read_at timestamptz default now();

-- ── 2. Unread-count helper (single query, no N+1) ───────────────────────
-- Returns (conversation_id, unread_count) for every conversation that has
-- unread messages for the given user. Conversations with zero unread are
-- simply omitted from the result.
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
    and m.sender_id <> p_user_id
    and m.created_at > coalesce(cm.last_read_at, '1970-01-01'::timestamptz)
  group by m.conversation_id;
$$;

grant execute on function public.get_unread_counts(uuid)
  to anon, authenticated, service_role;

-- ── 3. UPDATE policy: a member may only update their own membership row ──
drop policy if exists "members can update their own membership"
  on public.conversation_members;
create policy "members can update their own membership"
  on public.conversation_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
