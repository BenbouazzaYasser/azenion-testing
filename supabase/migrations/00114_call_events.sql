-- Migration: 00114_call_events
--
-- Adds a lightweight, ephemeral signaling channel for WebRTC calls in
-- Messenger. Only call *metadata/signals* are persisted here — never raw
-- audio/video streams (those travel peer-to-peer over WebRTC). Rows are
-- purged shortly after use so the table never grows.
--
-- Security model (follows the established 00047/00061/00071 patterns):
--   * RLS lets a user only insert rows AS THEMSELVES (sender_id forced to
--     auth.uid()) and only into conversations they belong to.
--   * Only conversation members may READ a conversation's call events —
--     non-members get an empty result set, and Supabase Realtime will not
--     deliver events to non-members either (RLS is applied per-subscriber).
--   * A user cannot signal into a conversation whose peer has blocked them
--     (DB-enforced, so direct client inserts cannot circumvent the block).
--   * get_call_peer() is the only way a client resolves the caller's profile,
--     and it refuses non-members (avoids leaking profiles).
--
-- Event flow (client side): offer -> answer -> (ice candidates) -> end.
-- Extra one-shot events: decline (recipient refuses), cancel (caller
-- abandons before answer), busy (recipient is already in a call), screen
-- (screen-share offer/answer is carried inside payload).

-- ── 1. call_events table ────────────────────────────────────────────────────
create table if not exists public.call_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  call_id uuid not null,
  event_type text not null check (
    event_type in ('offer', 'answer', 'ice', 'decline', 'cancel', 'end', 'busy', 'screen')
  ),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.call_events enable row level security;

create index if not exists idx_call_events_conversation
  on public.call_events(conversation_id, created_at desc);

create index if not exists idx_call_events_call
  on public.call_events(call_id);

comment on table public.call_events is
  'Ephemeral WebRTC signaling events for Messenger calls. Rows are purged shortly after use.';
comment on column public.call_events.event_type is
  'offer | answer | ice | decline | cancel | end | busy | screen';

-- ── 2. RLS: only members, and only as yourself, and never blocked ────────────
-- All call_events policies are scoped to `authenticated` only — anonymous
-- callers (PUBLIC/anon) are never granted read or write access here. This is
-- consistent with the narrow GRANT set (authenticated, service_role) below.
--
-- SELECT: members of the conversation may read its call events. Non-members
-- see nothing (empty result + realtime delivery denied). Because the policy
-- is `authenticated`-scoped and checks membership, anon cannot read either.
drop policy if exists "Conversation members can read call events"
  on public.call_events;
create policy "Conversation members can read call events"
  on public.call_events for select
  to authenticated
  using (public.is_conversation_member(call_events.conversation_id));

-- INSERT: only yourself, only into a conversation you belong to, and only
-- when no conversation peer has blocked you. The block check uses the
-- SECURITY DEFINER helper so a direct client insert cannot circumvent a block.
drop policy if exists "Conversation members can insert call events"
  on public.call_events;
create policy "Conversation members can insert call events"
  on public.call_events for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(call_events.conversation_id)
    and not public.is_blocked_by_conversation_peer(call_events.conversation_id, auth.uid())
  );

-- No UPDATE/DELETE policies (events are append-only; rows are purged by the
-- cleanup trigger rather than by clients). Blocked members cannot INSERT, so
-- the block is enforced DB-side on every client insert path.

grant select, insert
  on public.call_events to authenticated, service_role;

-- ── 3. get_call_peer: resolve the caller's profile safely ───────────────────
-- Members may resolve ONE peer's profile in a conversation. Non-members get
-- NULL (no profile leak). SECURITY DEFINER, but re-checks membership using
-- the RLS-bypassing helper so it cannot be abused to enumerate profiles.
create or replace function public.get_call_peer(
  p_conversation_id uuid,
  p_user_id uuid
)
returns table (
  id uuid,
  full_name text,
  username text,
  avatar_url text
)
language sql
stable
security definer set search_path = public
as $$
  select p.id, p.full_name, p.username, p.avatar_url
  from public.profiles p
  where p.id = p_user_id
    and public.is_conversation_member(p_conversation_id, auth.uid())
  limit 1;
$$;

grant execute on function public.get_call_peer(uuid, uuid)
  to authenticated, service_role;

-- ── 4. Ephemeral cleanup: purge stale rows on every insert ──────────────────
-- Keeps the table bounded without requiring a cron job. Runs as SECURITY
-- DEFINER so the purge is not subject to the caller's RLS limits on DELETE.
create or replace function public.cleanup_stale_call_events()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.call_events
  where created_at < now() - interval '15 minutes';
  return NEW;
end;
$$;

drop trigger if exists cleanup_stale_call_events on public.call_events;
create trigger cleanup_stale_call_events
  before insert on public.call_events
  for each row execute function public.cleanup_stale_call_events();

-- ── 5. Realtime ─────────────────────────────────────────────────────────────

-- Deliver full rows so subscribers can read sender_id / event_type / payload.
alter table public.call_events replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'call_events'
  ) then
    alter publication supabase_realtime add table public.call_events;
  end if;
exception when others then
  -- publication may not exist in local test env — do not fail migration
  null;
end $$;
