-- Migration: 00073_social_relationships
--
-- Adds the social graph for the public profile page: friend requests and
-- follows.
--
--   * friend_requests is a directed, stateful relationship:
--       pending -> accepted (friends) / declined
--     A single accepted row in either direction means the pair are friends.
--     Unfriending deletes the accepted row.
--   * follows is a lightweight directed relationship, fully independent from
--     friendship (a user can follow someone they are not friends with, and
--     vice versa).
--
-- Security model (established in 00047_chat_fix.sql / 00061_security_hardening.sql
-- / 00071_user_blocks.sql):
--   * RLS only lets a user read/insert/delete their OWN relationship rows.
--   * All state transitions (send/cancel/accept/decline/unfriend) happen
--     through SECURITY DEFINER RPCs pinned to auth.uid(), so clients can never
--     forge a request from someone else or mutate another user's rows.
--   * Cross-user reads (follower/following/friend counts and the relationship
--     state between the caller and a target) are exposed through a single
--     SECURITY DEFINER helper pinned to the caller.

-- ── 1. friend_requests table ────────────────────────────────────────────────
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sender_id, receiver_id),
  constraint friend_requests_no_self check (sender_id <> receiver_id)
);

alter table public.friend_requests enable row level security;

create index if not exists idx_friend_requests_receiver
  on public.friend_requests(receiver_id, status);
create index if not exists idx_friend_requests_sender
  on public.friend_requests(sender_id, status);

comment on table public.friend_requests is
  'Directed friend requests. pending -> accepted (friends) / declined. A single accepted row in either direction means the pair are friends.';

-- ── 2. follows table ────────────────────────────────────────────────────────
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

alter table public.follows enable row level security;

create index if not exists idx_follows_following
  on public.follows(following_id);

comment on table public.follows is
  'Directed follow relationships. follower_id follows following_id. Independent from friendship.';

-- ── 3. RLS ──────────────────────────────────────────────────────────────────
-- A user can only read/manage rows they are part of. State transitions are
-- performed exclusively through the SECURITY DEFINER RPCs below; direct
-- UPDATE is intentionally not granted to clients.
drop policy if exists "users can read own friend requests" on public.friend_requests;
create policy "users can read own friend requests"
  on public.friend_requests for select
  using (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "users can create own pending friend requests" on public.friend_requests;
create policy "users can create own pending friend requests"
  on public.friend_requests for insert
  with check (
    sender_id = auth.uid()
    and receiver_id <> auth.uid()
    and status = 'pending'
  );

drop policy if exists "users can read own follows" on public.follows;
create policy "users can read own follows"
  on public.follows for select
  using (follower_id = auth.uid());

drop policy if exists "users can follow others" on public.follows;
create policy "users can follow others"
  on public.follows for insert
  with check (follower_id = auth.uid() and following_id <> auth.uid());

drop policy if exists "users can unfollow others" on public.follows;
create policy "users can unfollow others"
  on public.follows for delete
  using (follower_id = auth.uid());

-- ── 4. Grants ───────────────────────────────────────────────────────────────
grant select, insert
  on public.friend_requests to authenticated, service_role;
grant select, insert, delete
  on public.follows to authenticated, service_role;

-- ── 5. SECURITY DEFINER helpers ─────────────────────────────────────────────
-- is_relationship_blocked: blocks apply to the whole relationship surface
-- (friends + follows), in both directions, consistent with Messenger.
create or replace function public.is_relationship_blocked(
  p_actor_id uuid,
  p_target_id uuid
)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = p_actor_id and blocked_id = p_target_id)
       or (blocker_id = p_target_id and blocked_id = p_actor_id)
  );
$$;

grant execute on function public.is_relationship_blocked(uuid, uuid)
  to authenticated, service_role;

-- get_relationship_state(p_target_id): the relationship between the CALLER
-- (pinned to auth.uid()) and the target, plus the target's public counts.
create or replace function public.get_relationship_state(p_target_id uuid)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_friend_status text;
  v_is_following boolean := false;
  v_is_followed_by boolean := false;
  v_follower_count bigint;
  v_following_count bigint;
  v_friend_count bigint;
begin
  if v_caller is not null then
    select
      case
        when exists (
          select 1 from public.friend_requests fr
          where fr.status = 'accepted'
            and ((fr.sender_id = v_caller and fr.receiver_id = p_target_id)
              or (fr.sender_id = p_target_id and fr.receiver_id = v_caller))
        ) then 'friends'
        when exists (
          select 1 from public.friend_requests fr
          where fr.sender_id = v_caller
            and fr.receiver_id = p_target_id
            and fr.status = 'pending'
        ) then 'request_sent'
        when exists (
          select 1 from public.friend_requests fr
          where fr.sender_id = p_target_id
            and fr.receiver_id = v_caller
            and fr.status = 'pending'
        ) then 'request_received'
        else 'none'
      end
    into v_friend_status;

    select exists (
      select 1 from public.follows f
      where f.follower_id = v_caller and f.following_id = p_target_id
    ) into v_is_following;

    select exists (
      select 1 from public.follows f
      where f.follower_id = p_target_id and f.following_id = v_caller
    ) into v_is_followed_by;
  else
    v_friend_status := 'none';
  end if;

  select count(*) into v_follower_count
  from public.follows f where f.following_id = p_target_id;

  select count(*) into v_following_count
  from public.follows f where f.follower_id = p_target_id;

  select count(*) into v_friend_count
  from public.friend_requests fr
  where fr.status = 'accepted'
    and (fr.sender_id = p_target_id or fr.receiver_id = p_target_id);

  return jsonb_build_object(
    'is_viewer', (v_caller is not null and v_caller = p_target_id),
    'is_authenticated', (v_caller is not null),
    'friend_status', v_friend_status,
    'is_following', v_is_following,
    'is_followed_by', v_is_followed_by,
    'follower_count', v_follower_count,
    'following_count', v_following_count,
    'friend_count', v_friend_count
  );
end;
$$;

grant execute on function public.get_relationship_state(uuid)
  to authenticated, service_role;

-- send_friend_request(p_receiver_id): creates a pending request from the
-- caller. Re-sending after a decline replaces the old declined row. A pending
-- or accepted request already in either direction is rejected.
create or replace function public.send_friend_request(p_receiver_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
begin
  if v_sender is null then
    raise exception 'Not authenticated';
  end if;
  if p_receiver_id is null or p_receiver_id = v_sender then
    raise exception 'Invalid friend request target';
  end if;
  if public.is_relationship_blocked(v_sender, p_receiver_id) then
    raise exception 'Unable to send a friend request to this user.';
  end if;
  if exists (
    select 1 from public.friend_requests fr
    where fr.status <> 'declined'
      and ((fr.sender_id = v_sender and fr.receiver_id = p_receiver_id)
        or (fr.sender_id = p_receiver_id and fr.receiver_id = v_sender))
  ) then
    raise exception 'A friend request already exists between you and this user.';
  end if;

  delete from public.friend_requests
  where sender_id = v_sender
    and receiver_id = p_receiver_id
    and status = 'declined';

  insert into public.friend_requests (sender_id, receiver_id, status)
  values (v_sender, p_receiver_id, 'pending');

  return jsonb_build_object('ok', true, 'status', 'request_sent');
end;
$$;

grant execute on function public.send_friend_request(uuid)
  to authenticated, service_role;

-- cancel_friend_request(p_receiver_id): the sender withdraws a pending request.
create or replace function public.cancel_friend_request(p_receiver_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
begin
  if v_sender is null then
    raise exception 'Not authenticated';
  end if;
  delete from public.friend_requests
  where sender_id = v_sender
    and receiver_id = p_receiver_id
    and status = 'pending';
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.cancel_friend_request(uuid)
  to authenticated, service_role;

-- respond_friend_request(p_sender_id, p_accept): the receiver accepts or
-- declines a pending request. Accepting turns the pair into friends.
create or replace function public.respond_friend_request(
  p_sender_id uuid,
  p_accept boolean
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_receiver uuid := auth.uid();
  v_updated integer;
begin
  if v_receiver is null then
    raise exception 'Not authenticated';
  end if;

  update public.friend_requests
  set status = case when p_accept then 'accepted' else 'declined' end,
      updated_at = now()
  where sender_id = p_sender_id
    and receiver_id = v_receiver
    and status = 'pending';

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'No pending friend request to respond to.';
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', case when p_accept then 'friends' else 'declined' end
  );
end;
$$;

grant execute on function public.respond_friend_request(uuid, boolean)
  to authenticated, service_role;

-- unfriend(p_target_id): either side of an accepted friendship removes it.
create or replace function public.unfriend(p_target_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null then
    raise exception 'Not authenticated';
  end if;
  delete from public.friend_requests
  where status = 'accepted'
    and ((sender_id = v_caller and receiver_id = p_target_id)
      or (sender_id = p_target_id and receiver_id = v_caller));
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.unfriend(uuid)
  to authenticated, service_role;

-- follow_user(p_target_id): caller follows the target (idempotent).
create or replace function public.follow_user(p_target_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_follower uuid := auth.uid();
begin
  if v_follower is null then
    raise exception 'Not authenticated';
  end if;
  if p_target_id is null or p_target_id = v_follower then
    raise exception 'Invalid follow target';
  end if;
  if public.is_relationship_blocked(v_follower, p_target_id) then
    raise exception 'Unable to follow this user.';
  end if;
  insert into public.follows (follower_id, following_id)
  values (v_follower, p_target_id)
  on conflict (follower_id, following_id) do nothing;
  return jsonb_build_object('ok', true, 'following', true);
end;
$$;

grant execute on function public.follow_user(uuid)
  to authenticated, service_role;

-- unfollow_user(p_target_id): caller stops following the target (idempotent).
create or replace function public.unfollow_user(p_target_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_follower uuid := auth.uid();
begin
  if v_follower is null then
    raise exception 'Not authenticated';
  end if;
  delete from public.follows
  where follower_id = v_follower and following_id = p_target_id;
  return jsonb_build_object('ok', true, 'following', false);
end;
$$;

grant execute on function public.unfollow_user(uuid)
  to authenticated, service_role;
