-- Migration: 00085_security_m5_live_sessions_anon
--
-- M5 (medium): anonymous callers can obtain private-session meeting URLs,
-- physical locations, and the creator's internal user id.
--
-- PROBLEM
--   get_live_sessions (SECURITY DEFINER, granted to anon) returned
--   `meeting_url` / `location` / `created_by` verbatim, and anon held a
--   direct SELECT grant on public.live_sessions. The home and community
--   pages also called get_live_sessions through the admin client, so every
--   logged-out visitor's HTML contained every session's join link and
--   location.
--
-- FIX
--   1. get_live_sessions redacts meeting_url / location / created_by for
--      `anon` callers. Redaction keys on auth.role() — NOT on auth.uid()
--      being null — because the service-role JWT has no `sub` and must keep
--      full data. Authenticated members still receive full session details
--      (sessions are a member-facing feature).
--   2. Revoke anon SELECT on public.live_sessions so the raw table is no
--      longer queryable anonymously; the RPC remains the anon read path.
--   3. The home/community pages are switched to the user-scoped client (see
--      code change) so logged-out HTML matches the anon view. NOTE: the
--      direct anon table query in actions/search.actions.ts will no longer
--      return live sessions for logged-out users — acceptable, it is an
--      authenticated search feature.
--
-- The function keeps the exact shape from 00045_live_session_attendance.sql
-- (attendee_count / joined / seats_remaining, nullable ends_at).

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
    case when coalesce(auth.role(), '') = 'anon' then null else ls.location end as location,
    case when coalesce(auth.role(), '') = 'anon' then null else ls.meeting_url end as meeting_url,
    ls.format,
    ls.capacity,
    case
      when ls.ends_at is not null and ls.ends_at <= now() then 'ENDED'
      when ls.starts_at <= now() then 'LIVE'
      else 'UPCOMING'
    end as status,
    ls.topics,
    case when coalesce(auth.role(), '') = 'anon' then null else ls.created_by end as created_by,
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

revoke select on public.live_sessions from anon;
grant select on public.live_sessions to authenticated, service_role;