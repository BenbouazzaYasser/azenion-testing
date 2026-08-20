-- Migration: 00044_live_sessions_optional_end
--
-- Makes the end time of a live session optional.
--
--   * live_sessions.ends_at becomes nullable. A session is valid with only a
--     date + start time (open-ended).
--   * The existing `check (ends_at > starts_at)` stays in place: PostgreSQL
--     CHECK constraints are satisfied when the expression evaluates to NULL, so
--     NULL ends_at rows are allowed while non-NULL values still must follow the
--     start time.
--   * get_live_sessions / create_live_session / update_live_session are
--     redefined so status (ENDED/LIVE/UPCOMING), duration_minutes, and ordering
--     tolerate NULL ends_at without breaking existing sessions.

alter table public.live_sessions
  alter column ends_at drop not null;

-- ── RPC: list sessions ────────────────────────────────────────────────────────
-- Computes status / duration / ordering with an optional end time:
--   * ENDED only when an end time exists and has passed.
--   * LIVE once it has started (regardless of whether an end is set).
--   * duration_minutes is NULL when there is no end time.
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
  duration_minutes integer
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
    end as duration_minutes
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

-- ── RPC: create a session ─────────────────────────────────────────────────────
drop function if exists public.create_live_session(text, text, text, uuid, text, timestamptz, timestamptz, text, text, text, integer, text[]);
create or replace function public.create_live_session(
  p_title text,
  p_description text,
  p_host_type text,
  p_host_id uuid,
  p_instructor text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_location text default null,
  p_meeting_url text default null,
  p_format text default 'ONLINE',
  p_capacity integer default null,
  p_topics text[] default '{}'
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_manage_live_session_host(p_host_type, p_host_id) then
    raise exception 'You do not have permission to create sessions for this host';
  end if;

  if p_host_type = 'BRANCH' and not exists (select 1 from public.branches where id = p_host_id) then
    raise exception 'Branch not found';
  end if;
  if p_host_type = 'TEAM' and not exists (select 1 from public.teams where id = p_host_id) then
    raise exception 'Team not found';
  end if;

  insert into public.live_sessions (
    title, description, host_type, host_id, instructor,
    starts_at, ends_at, location, meeting_url, format, capacity,
    status, topics, created_by
  )
  values (
    p_title, p_description, p_host_type, p_host_id, p_instructor,
    p_starts_at, p_ends_at, p_location, p_meeting_url, p_format, p_capacity,
    case
      when p_ends_at is not null and p_ends_at <= now() then 'ENDED'
      when p_starts_at <= now() then 'LIVE'
      else 'UPCOMING'
    end,
    p_topics, auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_live_session(text, text, text, uuid, text, timestamptz, timestamptz, text, text, text, integer, text[])
  to authenticated, service_role;

-- ── RPC: update a session ─────────────────────────────────────────────────────
drop function if exists public.update_live_session(uuid, text, text, text, uuid, text, timestamptz, timestamptz, text, text, text, integer, text[]);
create or replace function public.update_live_session(
  p_id uuid,
  p_title text,
  p_description text,
  p_host_type text,
  p_host_id uuid,
  p_instructor text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_location text default null,
  p_meeting_url text default null,
  p_format text default 'ONLINE',
  p_capacity integer default null,
  p_topics text[] default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (select 1 from public.live_sessions where id = p_id) then
    raise exception 'Session not found';
  end if;

  if not public.can_manage_live_session(p_id) then
    raise exception 'You do not have permission to edit this session';
  end if;

  if p_host_type = 'BRANCH' and not exists (select 1 from public.branches where id = p_host_id) then
    raise exception 'Branch not found';
  end if;
  if p_host_type = 'TEAM' and not exists (select 1 from public.teams where id = p_host_id) then
    raise exception 'Team not found';
  end if;
  if not public.can_manage_live_session_host(p_host_type, p_host_id) then
    raise exception 'You do not have permission to host sessions for this host';
  end if;

  update public.live_sessions set
    title       = p_title,
    description = p_description,
    host_type   = p_host_type,
    host_id     = p_host_id,
    instructor  = p_instructor,
    starts_at   = p_starts_at,
    ends_at     = p_ends_at,
    location    = p_location,
    meeting_url = p_meeting_url,
    format      = p_format,
    capacity    = p_capacity,
    status      = case
      when p_ends_at is not null and p_ends_at <= now() then 'ENDED'
      when p_starts_at <= now() then 'LIVE'
      else 'UPCOMING'
    end,
    topics      = coalesce(p_topics, topics),
    updated_at  = now()
  where id = p_id;
end;
$$;

grant execute on function public.update_live_session(uuid, text, text, text, uuid, text, timestamptz, timestamptz, text, text, text, integer, text[])
  to authenticated, service_role;
