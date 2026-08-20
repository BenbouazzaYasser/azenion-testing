-- Migration: 00073_call_events
--
-- Ephemeral WebRTC signaling for 1-to-1 voice/video calls.
--
-- Why a Postgres-backed table instead of Realtime "broadcast" channels:
--   * Broadcast channels bypass RLS entirely — anyone who can guess the channel
--     name can subscribe and receive signaling (offer/answer/ICE), which leaks
--     session data and lets an unrelated user signal into a conversation they
--     are not part of.
--   * Postgres-backed rows are protected on BOTH write and realtime subscribe:
--     INSERT requires sender_id = auth.uid() and membership in the
--     conversation; SELECT/Realtime delivery requires membership.
--
-- Ephemerality:
--   * A BEFORE INSERT trigger deletes events older than 15 minutes on every
--     insert, so offer/answer/ICE payloads never persist past the life of a
--     call. No permanent storage of SDP/ICE data.
--
-- Realtime:
--   * REPLICA IDENTITY FULL so UPDATE/DELETE-style logical events carry the
--     full row (same lesson as 00068) and the event is published.

-- ── 1. call_events table ─────────────────────────────────────────────────────
create table if not exists public.call_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  call_id uuid not null,
  event_type text not null check (
    event_type in ('offer', 'answer', 'ice', 'cancel', 'decline', 'busy', 'end')
  ),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_call_events_conversation_id
  on public.call_events(conversation_id);
create index if not exists idx_call_events_call_id
  on public.call_events(call_id);
create index if not exists idx_call_events_created_at
  on public.call_events(created_at);

alter table public.call_events enable row level security;

comment on table public.call_events is
  'Ephemeral WebRTC signaling events for 1-to-1 calls. Rows self-expire after 15 minutes.';
comment on column public.call_events.payload is
  'Event payload: offer/answer SDP, ICE candidate, or call metadata. Never stored permanently.';

-- ── 2. RLS: members can read/send; sender_id is always the caller ───────────
drop policy if exists "call members can read call events" on public.call_events;
create policy "call members can read call events"
  on public.call_events for select
  using (public.is_conversation_member(call_events.conversation_id));

drop policy if exists "call members can send call events" on public.call_events;
create policy "call members can send call events"
  on public.call_events for insert
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(call_events.conversation_id)
    and not public.is_blocked_by_conversation_peer(call_events.conversation_id, auth.uid())
  );

grant select, insert on public.call_events to authenticated, service_role;

-- ── 3. Realtime: publish and deliver full rows ──────────────────────────────
alter table public.call_events replica identity full;
alter publication supabase_realtime add table public.call_events;

-- ── 4. Ephemeral: expire signaling older than 15 minutes ────────────────────
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
