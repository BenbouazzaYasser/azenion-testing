-- Migration: 00047_chat_fix
--
-- ROOT CAUSE: the RLS policy "members can view conversation members" on
-- conversation_members was self-referential:
--
--   using (exists (select 1 from conversation_members cm where ...))
--
-- Postgres evaluates that subquery under the SAME policy, recursing until it
-- raises "infinite recursion detected in policy for relation". Every chat
-- operation touches conversation_members (message insert/read policy checks,
-- sidebar membership reads, realtime RLS), so the whole system failed:
--   * sendMessage   -> INSERT policy check errored -> nothing persisted
--   * getMessages   -> policy check errored        -> empty thread
--   * getConversations -> membership read errored  -> empty sidebar
--   * realtime      -> subscriber RLS check errored -> no delivery
-- get_or_create_conversation worked only because it is SECURITY DEFINER and
-- bypasses RLS, which is why opening a user's chat "worked" but nothing else did.
--
-- Fixes:
--   1. Add a SECURITY DEFINER membership helper and route every chat policy
--      through it, so policies never query conversation_members under RLS
--      (removes the recursion at its source).
--   2. Conversation creation is now RPC-only: the broad INSERT policies on
--      conversations / conversation_members are dropped (any authenticated
--      user could previously create conversations with arbitrary members).
--   3. Exactly one private conversation per user pair, enforced in the DB:
--      canonical member_a/member_b columns, a unique index on the unordered
--      pair, and a trigger that syncs them. get_or_create_conversation reuses
--      existing conversations and serializes with an advisory lock.
--   4. conversations.updated_at bumps on every message insert/delete so the
--      sidebar orders by recent activity.
--   5. REPLICA IDENTITY FULL on messages so realtime delivers full rows.

-- ── 1. Membership helper (no recursion, RLS-bypassing) ───────────────────────
create or replace function public.is_conversation_member(
  p_conversation_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id
      and user_id = p_user_id
  );
$$;

grant execute on function public.is_conversation_member(uuid, uuid)
  to anon, authenticated, service_role;

-- ── 2. Recreate chat policies via the helper ─────────────────────────────────
drop policy if exists "members can view their conversations" on public.conversations;
create policy "members can view their conversations"
  on public.conversations for select
  using (public.is_conversation_member(conversations.id));

drop policy if exists "members can view conversation members" on public.conversation_members;
create policy "members can view conversation members"
  on public.conversation_members for select
  using (public.is_conversation_member(conversation_members.conversation_id));

drop policy if exists "members can read messages" on public.messages;
create policy "members can read messages"
  on public.messages for select
  using (public.is_conversation_member(messages.conversation_id));

drop policy if exists "members can send messages" on public.messages;
create policy "members can send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(messages.conversation_id)
  );

-- ── 3. Conversation creation is RPC-only ─────────────────────────────────────
drop policy if exists "authenticated users can create conversations" on public.conversations;
drop policy if exists "system can add members" on public.conversation_members;

-- ── 4. Bump conversations.updated_at on message activity ─────────────────────
create or replace function public.bump_conversation_updated_at()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = NEW.conversation_id;
  return NEW;
end;
$$;

drop trigger if exists bump_conversation_updated_at on public.messages;
create trigger bump_conversation_updated_at
  after insert or delete on public.messages
  for each row execute function public.bump_conversation_updated_at();

-- ── 5. Exactly one private conversation per user pair ────────────────────────
alter table public.conversations
  add column if not exists member_a uuid references public.profiles(id) on delete set null;
alter table public.conversations
  add column if not exists member_b uuid references public.profiles(id) on delete set null;

-- Backfill existing 2-member conversations before adding the unique index.
update public.conversations c
set member_a = m.min_user, member_b = m.max_user
from (
  select conversation_id,
         min(user_id::text)::uuid as min_user,
         max(user_id::text)::uuid as max_user
  from public.conversation_members
  group by conversation_id
  having count(*) = 2
) m
where c.id = m.conversation_id;

create unique index if not exists conversations_unique_member_pair
  on public.conversations (least(member_a, member_b), greatest(member_a, member_b));

create or replace function public.sync_conversation_member_pair()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_a uuid;
  v_b uuid;
  v_count integer;
begin
  select count(*), min(user_id::text)::uuid, max(user_id::text)::uuid
  into v_count, v_a, v_b
  from public.conversation_members
  where conversation_id = NEW.conversation_id;

  if v_count = 2 then
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

-- ── get_or_create_conversation: reuse existing, never duplicate ─────────────
drop function if exists public.get_or_create_conversation(uuid);
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

-- ── 6. Realtime: deliver full message rows ───────────────────────────────────
alter table public.messages replica identity full;
