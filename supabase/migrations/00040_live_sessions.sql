-- ── Live Sessions ────────────────────────────────────────────────────────────
-- Academy → Live Sessions → "Upcoming Sessions".
--
-- Authorization model:
--   * Platform admin can create / edit / delete any session.
--   * Branch leaders can manage sessions hosted by branches they lead.
--   * Team leaders (owner / admin) can manage sessions hosted by teams they lead.
--   * Everyone else is read-only.
--
-- Writes are RPC-only:
--   create_live_session(...)
--   update_live_session(...)
--   delete_live_session(...)
-- anon / authenticated have NO direct INSERT/UPDATE/DELETE on the table, so the
-- owner checks above are enforced inside the SECURITY DEFINER functions and can
-- never be bypassed from the client. service_role keeps full access.

-- ── Table ─────────────────────────────────────────────────────────────────────
create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  description text not null default '',
  host_type text not null check (host_type in ('BRANCH', 'TEAM')),
  host_id uuid not null,
  instructor text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  meeting_url text,
  format text not null default 'ONLINE' check (format in ('ONLINE', 'IN_PERSON')),
  capacity integer,
  status text not null default 'UPCOMING'
    check (status in ('UPCOMING', 'LIVE', 'ENDED')),
  topics text[] not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  check (ends_at > starts_at)
);

-- host_id references branches(id) OR teams(id) depending on host_type
-- (polymorphic reference — enforced inside the RPCs, not with a single FK).

create index if not exists idx_live_sessions_status
  on public.live_sessions(status);
create index if not exists idx_live_sessions_starts_at
  on public.live_sessions(starts_at);
create index if not exists idx_live_sessions_host
  on public.live_sessions(host_type, host_id);
create index if not exists idx_live_sessions_created_by
  on public.live_sessions(created_by);

-- ── Grants ────────────────────────────────────────────────────────────────────
grant select on public.live_sessions to anon, authenticated;
grant select, insert, update, delete on public.live_sessions to service_role;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.live_sessions enable row level security;

drop policy if exists "live sessions are publicly readable" on public.live_sessions;
create policy "live sessions are publicly readable"
  on public.live_sessions for select using (true);

-- ── Authorization helpers ─────────────────────────────────────────────────────
-- Team "leader" = owner or admin of the team.
create or replace function public.is_team_leader(
  p_team_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id
      and user_id = p_user_id
      and role in ('owner', 'admin')
  );
$$;

grant execute on function public.is_team_leader(uuid, uuid) to anon, authenticated, service_role;

-- Can this user host a session for the given host? (used by create / host-change)
create or replace function public.can_manage_live_session_host(
  p_host_type text,
  p_host_id uuid
)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    public.is_platform_admin()
    or (
      p_host_type = 'BRANCH'
      and public.is_branch_leader(p_host_id)
    )
    or (
      p_host_type = 'TEAM'
      and public.is_team_leader(p_host_id)
    );
$$;

grant execute on function public.can_manage_live_session_host(text, uuid) to anon, authenticated, service_role;

-- Can this user manage the given session? (used by update / delete)
create or replace function public.can_manage_live_session(p_session_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    public.is_platform_admin()
    or (
      ls.host_type = 'BRANCH'
      and public.is_branch_leader(ls.host_id)
    )
    or (
      ls.host_type = 'TEAM'
      and public.is_team_leader(ls.host_id)
    )
  from public.live_sessions ls
  where ls.id = p_session_id;
$$;

grant execute on function public.can_manage_live_session(uuid) to anon, authenticated, service_role;

-- ── RPC: list sessions ────────────────────────────────────────────────────────
-- Computes the live status from starts_at / ends_at and joins the host name
-- internally (SECURITY DEFINER), so the page always reflects current time and
-- ordering: LIVE → upcoming (nearest first) → ended (latest first).
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
      when ls.ends_at <= now() then 'ENDED'
      when ls.starts_at <= now() then 'LIVE'
      else 'UPCOMING'
    end as status,
    ls.topics,
    ls.created_by,
    greatest(1, round(extract(epoch from (ls.ends_at - ls.starts_at)) / 60))::int
      as duration_minutes
  from public.live_sessions ls
  left join public.branches b on ls.host_type = 'BRANCH' and b.id = ls.host_id
  left join public.teams t on ls.host_type = 'TEAM' and t.id = ls.host_id
  order by
    case
      when ls.ends_at <= now() then 2
      when ls.starts_at <= now() then 0
      else 1
    end,
    case when ls.ends_at > now() then ls.starts_at end asc nulls last,
    case when ls.ends_at <= now() then ls.starts_at end desc nulls last;
$$;

grant execute on function public.get_live_sessions() to anon, authenticated, service_role;

-- ── RPC: hosts the user may create sessions for ───────────────────────────────
-- Platform admins get every branch and team; leaders get only the branches /
-- teams they lead. Used to gate the "Create Session" UI and the host picker.
drop function if exists public.get_manageable_session_hosts();
create or replace function public.get_manageable_session_hosts()
returns table (host_type text, host_id uuid, host_name text)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  if public.is_platform_admin() then
    return query
      select 'BRANCH'::text, b.id, b.name from public.branches b
      union all
      select 'TEAM'::text, t.id, t.name from public.teams t
      order by 3;
    return;
  end if;

  return query
    select 'BRANCH'::text, b.id, b.name
    from public.branch_leaders bl
    join public.branches b on b.id = bl.branch_id
    where bl.user_id = auth.uid()
    union all
    select 'TEAM'::text, t.id, t.name
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where tm.user_id = auth.uid() and tm.role in ('owner', 'admin')
    order by 3;
end;
$$;

grant execute on function public.get_manageable_session_hosts() to authenticated, service_role;

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
      when p_ends_at <= now() then 'ENDED'
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
      when p_ends_at <= now() then 'ENDED'
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

-- ── RPC: delete a session ─────────────────────────────────────────────────────
drop function if exists public.delete_live_session(uuid);
create or replace function public.delete_live_session(p_id uuid)
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
    raise exception 'You do not have permission to delete this session';
  end if;

  delete from public.live_sessions where id = p_id;
end;
$$;

grant execute on function public.delete_live_session(uuid)
  to authenticated, service_role;
