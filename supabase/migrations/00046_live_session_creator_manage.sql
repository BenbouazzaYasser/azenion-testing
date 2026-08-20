-- Migration: 00046_live_session_creator_manage
--
-- A user who created a Live Session must always be able to edit and delete it,
-- even if they later lose the permission that allowed them to create it.
--
-- Authorization order (matches the recommended model):
--
--   Platform Admin
--       ↓
--   Session Creator   (created_by)
--       ↓
--   Permission-based Manager
--
-- Changes:
--   * can_manage_live_session now returns true for the session creator
--     (ls.created_by = auth.uid()), so update + delete succeed for owners.
--   * update_live_session lets the creator keep editing the session in place
--     (same host) even if they no longer hold host permission. Changing the
--     host still requires host permission, so security is not weakened.
--
-- Creation still requires host permission (can_manage_live_session_host) and is
-- unchanged.

-- ── Permission helper: can_manage_live_session ───────────────────────────────
drop function if exists public.can_manage_live_session(uuid);
create or replace function public.can_manage_live_session(p_session_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select
    public.is_platform_admin()
    or ls.created_by = auth.uid()
    or (
      ls.host_type = 'BRANCH'
      and public.is_branch_leader(ls.host_id)
    )
    or (
      ls.host_type = 'TEAM'
      and public.has_team_permission(ls.host_id, 'MANAGE_LIVE_SESSIONS')
    )
  from public.live_sessions ls
  where ls.id = p_session_id;
$$;

grant execute on function public.can_manage_live_session(uuid)
  to anon, authenticated, service_role;

-- ── RPC: update a session ────────────────────────────────────────────────────
-- Creator can edit their own session in place (same host) without current host
-- permission. Changing the host still requires host permission.
drop function if exists public.update_live_session(
  uuid, text, text, text, uuid, text, timestamptz, timestamptz,
  text, text, text, integer, text[]
);
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
declare
  v_current_host_type text;
  v_current_host_id uuid;
  v_is_creator boolean;
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

  select host_type, host_id, (created_by = auth.uid())
  into v_current_host_type, v_current_host_id, v_is_creator
  from public.live_sessions
  where id = p_id;

  if p_host_type = 'BRANCH' and not exists (select 1 from public.branches where id = p_host_id) then
    raise exception 'Branch not found';
  end if;
  if p_host_type = 'TEAM' and not exists (select 1 from public.teams where id = p_host_id) then
    raise exception 'Team not found';
  end if;

  if not (
    public.can_manage_live_session_host(p_host_type, p_host_id)
    or (
      v_is_creator
      and p_host_type = v_current_host_type
      and p_host_id = v_current_host_id
    )
  ) then
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

grant execute on function public.update_live_session(
  uuid, text, text, text, uuid, text, timestamptz, timestamptz,
  text, text, text, integer, text[]
)
  to authenticated, service_role;
