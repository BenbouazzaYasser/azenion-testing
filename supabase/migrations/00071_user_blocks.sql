-- Migration: 00071_user_blocks
--
-- Adds per-user blocking for Messenger.
--
--   * A block is a directed relationship: blocker_id has blocked blocked_id.
--   * Both directions are independent (A blocking B does not block A), so this
--     stays completely separate from any future friend/follow system — it is
--     its own table and never mixed with membership/social graph rows.
--   * Blocking never deletes data: conversations and messages are left intact.
--
-- Security model (established in 00047_chat_fix.sql / 00061_security_hardening.sql):
--   * RLS only lets a user read/insert/delete their OWN block rows.
--   * Authorization for "has X blocked Y" is exposed through SECURITY DEFINER
--     helpers so server actions can enforce it in both directions without
--     bypassing RLS directly.
--   * Enforcement happens at the database layer too: the messages INSERT policy
--     rejects a message whose recipient has blocked the sender, so direct
--     client/API inserts cannot circumvent the block.
--   * get_or_create_conversation (the only way to create a conversation) rejects
--     creating/opening a thread with a user who has blocked the caller.

-- ── 1. user_blocks table ────────────────────────────────────────────────────
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self_block check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;

create index if not exists idx_user_blocks_blocked
  on public.user_blocks(blocked_id);

comment on table public.user_blocks is
  'Directed block relationships for Messenger. blocker_id has blocked blocked_id.';
comment on column public.user_blocks.blocker_id is
  'The user who issued the block.';
comment on column public.user_blocks.blocked_id is
  'The user who is blocked and therefore cannot contact the blocker.';

-- ── 2. RLS: a user can only manage their own blocks ──────────────────────────
-- SELECT: only the blocker may see the blocks they created.
-- INSERT: only yourself, and never yourself as the blocked user.
-- DELETE: only remove your own blocks. (No UPDATE policy — blocks are
-- created and removed, never mutated.)
drop policy if exists "blockers can read their own blocks"
  on public.user_blocks;
create policy "blockers can read their own blocks"
  on public.user_blocks for select
  using (blocker_id = auth.uid());

drop policy if exists "blockers can create their own blocks"
  on public.user_blocks;
create policy "blockers can create their own blocks"
  on public.user_blocks for insert
  with check (blocker_id = auth.uid() and blocked_id <> auth.uid());

drop policy if exists "blockers can remove their own blocks"
  on public.user_blocks;
create policy "blockers can remove their own blocks"
  on public.user_blocks for delete
  using (blocker_id = auth.uid());

-- ── 3. Grants ───────────────────────────────────────────────────────────────
grant select, insert, delete
  on public.user_blocks to authenticated, service_role;

-- ── 4. Helpers ──────────────────────────────────────────────────────────────
-- is_user_blocked(p_blocker_id, p_blocked_id): direct, RLS-bypassing check.
-- Used by server actions and the conversation page to enforce blocking in
-- either direction.
create or replace function public.is_user_blocked(
  p_blocker_id uuid,
  p_blocked_id uuid
)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks
    where blocker_id = p_blocker_id
      and blocked_id = p_blocked_id
  );
$$;

grant execute on function public.is_user_blocked(uuid, uuid)
  to authenticated, service_role;

-- get_users_that_blocked_me(p_user_id): returns the ids of every user who has
-- blocked p_user_id. Pinned to the authenticated caller so a user can only
-- discover who blocks themselves, not arbitrary victims.
create or replace function public.get_users_that_blocked_me(p_user_id uuid)
returns setof uuid
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    return;
  end if;
  return query
    select ub.blocker_id
    from public.user_blocks ub
    where ub.blocked_id = p_user_id;
end;
$$;

grant execute on function public.get_users_that_blocked_me(uuid)
  to authenticated, service_role;

-- is_blocked_by_conversation_peer(p_conversation_id, p_sender_id): true when a
-- conversation peer (someone other than p_sender_id) has blocked p_sender_id.
-- SECURITY DEFINER so it can be used safely inside the messages INSERT policy
-- without triggering conversation_members RLS recursion.
create or replace function public.is_blocked_by_conversation_peer(
  p_conversation_id uuid,
  p_sender_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm
    join public.user_blocks ub
      on ub.blocker_id = cm.user_id
     and ub.blocked_id = p_sender_id
    where cm.conversation_id = p_conversation_id
      and cm.user_id <> p_sender_id
  );
$$;

grant execute on function public.is_blocked_by_conversation_peer(uuid, uuid)
  to authenticated, service_role;

-- ── 5. Enforce at the database layer: blocked users cannot send messages ─────
-- Even a direct client INSERT (bypassing the server action) is rejected when
-- a conversation peer has blocked the sender.
drop policy if exists "members can send messages" on public.messages;
create policy "members can send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(messages.conversation_id)
    and not public.is_blocked_by_conversation_peer(messages.conversation_id, auth.uid())
  );

-- ── 6. Enforce on conversation creation ──────────────────────────────────────
-- get_or_create_conversation is the only way to create/open a private thread
-- (INSERT policies on conversations/conversation_members were dropped in
-- 00047_chat_fix.sql). Refuse to open one with a user who has blocked the
-- caller — that keeps the blocked user from initiating contact even through
-- a direct RPC call.
create or replace function public.get_or_create_conversation(p_user_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_conversation_id uuid;
  v_current_user_id uuid;
  v_a uuid;
  v_b uuid;
begin
  v_current_user_id := auth.uid();
  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if p_user_id is null or p_user_id = v_current_user_id then
    raise exception 'Invalid conversation partner';
  end if;

  if public.is_user_blocked(p_user_id, v_current_user_id) then
    raise exception 'This user has blocked you, so you cannot start a conversation with them.';
  end if;

  if v_current_user_id < p_user_id then
    v_a := v_current_user_id;
    v_b := p_user_id;
  else
    v_a := p_user_id;
    v_b := v_current_user_id;
  end if;

  -- Serialize concurrent get-or-create for the same pair so only one
  -- conversation can ever be created.
  perform pg_advisory_xact_lock(hashtextextended(v_a || '|' || v_b, 0));

  select id into v_conversation_id
  from public.conversations
  where member_a = v_a and member_b = v_b;

  if v_conversation_id is null then
    insert into public.conversations default values
    returning id into v_conversation_id;

    insert into public.conversation_members (conversation_id, user_id)
    values (v_conversation_id, v_a), (v_conversation_id, v_b);
  end if;

  return v_conversation_id;
end;
$$;

grant execute on function public.get_or_create_conversation(uuid) to authenticated;
