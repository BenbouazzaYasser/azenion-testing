-- Migration: 00045_live_session_attendance
--
-- Adds attendance to live sessions:
--   * live_session_attendees: a user can join a session at most once
--     (unique on session_id + user_id), so duplicate joins are impossible.
--   * join_live_session: atomic join that enforces capacity. The session row is
--     locked (FOR UPDATE) so concurrent joins cannot oversell seats. Joining
--     when already joined is a no-op, never a duplicate row.
--   * leave_live_session: removes the attendee row (decrements the count).
--   * get_live_sessions now also returns attendee_count, joined (for the
--     current user), and seats_remaining (NULL when the session is unlimited).
--
-- Writes are RPC-only: authenticated has NO direct INSERT/UPDATE/DELETE on the
-- table, so capacity + duplicate enforcement can never be bypassed from the
-- client. service_role keeps full access.

-- ── Table ─────────────────────────────────────────────────────────────────────
create table if not exists public.live_session_attendees (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (session_id, user_id)
);

alter table public.live_session_attendees enable row level security;

drop policy if exists "session attendees are publicly readable" on public.live_session_attendees;
create policy "session attendees are publicly readable"
  on public.live_session_attendees for select using (true);

create index if not exists idx_live_session_attendees_session_id
  on public.live_session_attendees(session_id);
create index if not exists idx_live_session_attendees_user_id
  on public.live_session_attendees(user_id);

-- ── Grants ────────────────────────────────────────────────────────────────────
grant select on public.live_session_attendees to anon, authenticated, service_role;
grant select, insert, update, delete on public.live_session_attendees to service_role;

-- ── RPC: join a session ───────────────────────────────────────────────────────
-- Enforces capacity atomically (session row lock) and never creates a
-- duplicate attendance row. Returns the join outcome + refreshed counts so the
-- UI can update immediately.
drop function if exists public.join_live_session(uuid);
create or replace function public.join_live_session(p_session_id uuid)
returns table (joined boolean, attendee_count integer, capacity integer)
language plpgsql
security definer set search_path = public
as $$
declare
  v_capacity integer;
  v_count integer;
  v_joined boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select ls.capacity into v_capacity
  from public.live_sessions ls
  where ls.id = p_session_id
  for update;

  if not found then
    raise exception 'Session not found';
  end if;

  if exists (
    select 1 from public.live_session_attendees
    where session_id = p_session_id and user_id = auth.uid()
  ) then
    v_joined := true;
  else
    select count(*) into v_count
    from public.live_session_attendees
    where session_id = p_session_id;

    if v_capacity is not null and v_count >= v_capacity then
      raise exception 'This session is full';
    end if;

    insert into public.live_session_attendees (session_id, user_id)
    values (p_session_id, auth.uid())
    on conflict (session_id, user_id) do nothing;

    v_joined := found;
  end if;

  select count(*) into v_count
  from public.live_session_attendees
  where session_id = p_session_id;

  return query select v_joined, v_count::integer, v_capacity;
end;
$$;

grant execute on function public.join_live_session(uuid) to authenticated, service_role;

-- ── RPC: leave a session ──────────────────────────────────────────────────────
-- Removing the attendee row decrements the count by exactly one.
drop function if exists public.leave_live_session(uuid);
create or replace function public.leave_live_session(p_session_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.live_session_attendees
  where session_id = p_session_id and user_id = auth.uid();
end;
$$;

grant execute on function public.leave_live_session(uuid) to authenticated, service_role;

-- ── RPC: list sessions ────────────────────────────────────────────────────────
-- Adds attendee_count / joined / seats_remaining to every session. seats_remaining
-- is NULL for unlimited sessions (capacity is null).
drop function if exists public.get_live_sessions();
create or replace function public.get_live_sessions()
returns table (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  title text,
  description text,
  host_type text,
  host_id uuid,
  host_name text,
  instructor text,
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  meeting_url text,
  format text,
  capacity integer,
  status text,
  topics text[],
  created_by uuid,
  duration_minutes integer,
  attendee_count integer,
  joined boolean,
  seats_remaining integer
)
language sql
security definer set search_path = public
stable
as $$
  select
    ls.id,
    ls.created_at,
    ls.updated_at,
    ls.title,
    ls.description,
    ls.host_type,
    ls.host_id,
    coalesce(b.name, t.name) as host_name,
    ls.instructor,
    ls.starts_at,
    ls.ends_at,
    ls.location,
    ls.meeting_url,
    ls.format,
    ls.capacity,
    case
      when ls.ends_at is not null and ls.ends_at <= now() then 'ENDED'
      when ls.starts_at <= now() then 'LIVE'
      else 'UPCOMING'
    end as status,
    ls.topics,
    ls.created_by,
    case
      when ls.ends_at is null then null
      else greatest(1, round(extract(epoch from (ls.ends_at - ls.starts_at)) / 60))::int
    end as duration_minutes,
    (select count(*)::int
     from public.live_session_attendees a
     where a.session_id = ls.id) as attendee_count,
    exists (
      select 1 from public.live_session_attendees a
      where a.session_id = ls.id and a.user_id = auth.uid()
    ) as joined,
    case
      when ls.capacity is null then null
      else greatest(
        0,
        ls.capacity - (select count(*)::int
                       from public.live_session_attendees a
                       where a.session_id = ls.id)
      )
    end as seats_remaining
  from public.live_sessions ls
  left join public.branches b on ls.host_type = 'BRANCH' and b.id = ls.host_id
  left join public.teams t on ls.host_type = 'TEAM' and t.id = ls.host_id
  order by
    case
      when ls.ends_at is not null and ls.ends_at <= now() then 2
      when ls.starts_at <= now() then 0
      else 1
    end,
    case
      when ls.ends_at is null or ls.ends_at > now() then ls.starts_at
    end asc nulls last,
    case
      when ls.ends_at is not null and ls.ends_at <= now() then ls.starts_at
    end desc nulls last;
$$;

grant execute on function public.get_live_sessions() to anon, authenticated, service_role;
