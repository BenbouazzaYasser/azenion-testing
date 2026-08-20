-- Migration: 00089_security_m3_url_scheme_validation
--
-- M3 (medium): dangerous URL schemes can be stored and rendered as clickable
-- links. App-side zod validation (see code changes) rejects javascript: /
-- data: / vbscript: / protocol-relative URLs at the boundary; this migration
-- adds the same check at the database layer for the RPC write paths so the
-- invariant holds even when the app layer is bypassed.
--
-- Affected fields (clickable links stored by RPCs):
--   * live_sessions.meeting_url      -> create_live_session / update_live_session
--   * branch_events.registration_url -> create_branch_event / update_branch_event
--   * branch_highlights.link_url     -> create_branch_highlight / update_branch_highlight
--
-- Image/cover fields (logo_url, image_url, cover_url) are intentionally NOT
-- scheme-validated here because they may legitimately hold private-media
-- markers or storage paths, not user-clickable links.

create or replace function public.is_safe_http_url(p_value text)
returns boolean
language sql
immutable
as $$
  select
    p_value is null
    or trim(p_value) = ''
    or lower(split_part(trim(p_value), '://', 1)) in ('http', 'https');
$$;

grant execute on function public.is_safe_http_url(text) to anon, authenticated, service_role;

-- ── create_live_session ──────────────────────────────────────────────────────
-- Body preserved from 00044_live_sessions_optional_end.sql (null-safe status).

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

  if not public.is_safe_http_url(p_meeting_url) then
    raise exception 'Meeting URL must use http or https';
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

-- ── update_live_session ──────────────────────────────────────────────────────
-- Body preserved from 00046_live_session_creator_manage.sql (creator can edit
-- their own session in place; host changes require host permission).

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

  if not public.is_safe_http_url(p_meeting_url) then
    raise exception 'Meeting URL must use http or https';
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

-- ── create_branch_event ──────────────────────────────────────────────────────

create or replace function public.create_branch_event(
  p_branch_id uuid,
  p_title text,
  p_starts_at timestamptz default null,
  p_description text default null,
  p_location text default null,
  p_ends_at timestamptz default null,
  p_cover_url text default null,
  p_registration_url text default null,
  p_visibility text default 'public',
  p_schedule text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_event_id uuid;
  v_branch_name text;
begin
  if not public.is_branch_leader(p_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch leaders can create events';
  end if;

  if not public.is_safe_http_url(p_registration_url) then
    raise exception 'Registration URL must use http or https';
  end if;

  select name into v_branch_name
  from public.branches
  where id = p_branch_id;

  if v_branch_name is null then
    raise exception 'Branch not found';
  end if;

  insert into public.branch_events (
    branch_id, title, description, location, starts_at, ends_at,
    cover_url, registration_url, visibility, schedule
  )
  values (
    p_branch_id, p_title, p_description, p_location, p_starts_at, p_ends_at,
    p_cover_url, p_registration_url, p_visibility, p_schedule
  )
  returning id into v_event_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'created_branch_event',
    jsonb_build_object(
      'branch_id', p_branch_id,
      'branch_name', v_branch_name,
      'event_id', v_event_id,
      'event_title', p_title
    )
  );

  return v_event_id;
end;
$$;

grant execute on function public.create_branch_event(uuid, text, timestamptz, text, text, timestamptz, text, text, text, text) to anon, authenticated, service_role;

-- ── update_branch_event ──────────────────────────────────────────────────────

create or replace function public.update_branch_event(
  p_event_id uuid,
  p_title text default null,
  p_description text default null,
  p_location text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_cover_url text default null,
  p_registration_url text default null,
  p_visibility text default null,
  p_schedule text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  select branch_id into v_branch_id
  from public.branch_events
  where id = p_event_id;

  if v_branch_id is null then
    raise exception 'Event not found';
  end if;

  if not public.is_branch_leader(v_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch leaders can edit events';
  end if;

  if not public.is_safe_http_url(p_registration_url) then
    raise exception 'Registration URL must use http or https';
  end if;

  update public.branch_events set
    title             = coalesce(p_title, title),
    description       = coalesce(p_description, description),
    location          = coalesce(p_location, location),
    starts_at         = coalesce(p_starts_at, starts_at),
    ends_at           = coalesce(p_ends_at, ends_at),
    cover_url         = coalesce(p_cover_url, cover_url),
    registration_url  = coalesce(p_registration_url, registration_url),
    visibility        = coalesce(p_visibility, visibility),
    schedule          = coalesce(p_schedule, schedule),
    updated_at        = now()
  where id = p_event_id;
end;
$$;

grant execute on function public.update_branch_event(uuid, text, text, text, timestamptz, timestamptz, text, text, text, text) to anon, authenticated, service_role;

-- ── create_branch_highlight ──────────────────────────────────────────────────

create or replace function public.create_branch_highlight(
  p_branch_id uuid,
  p_title text,
  p_description text default null,
  p_image_url text default null,
  p_link_url text default null,
  p_sort_order int default 0
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_highlight_id uuid;
  v_branch_name text;
begin
  if not public.is_branch_leader(p_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch leaders can create highlights';
  end if;

  if not public.is_safe_http_url(p_link_url) then
    raise exception 'Link URL must use http or https';
  end if;

  select name into v_branch_name
  from public.branches
  where id = p_branch_id;

  if v_branch_name is null then
    raise exception 'Branch not found';
  end if;

  insert into public.branch_highlights (
    branch_id, title, description, image_url, link_url, sort_order
  )
  values (p_branch_id, p_title, p_description, p_image_url, p_link_url, p_sort_order)
  returning id into v_highlight_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'created_branch_highlight',
    jsonb_build_object(
      'branch_id', p_branch_id,
      'branch_name', v_branch_name,
      'highlight_id', v_highlight_id,
      'highlight_title', p_title
    )
  );

  return v_highlight_id;
end;
$$;

grant execute on function public.create_branch_highlight(uuid, text, text, text, text, int) to anon, authenticated, service_role;

-- ── update_branch_highlight ──────────────────────────────────────────────────

create or replace function public.update_branch_highlight(
  p_highlight_id uuid,
  p_title text default null,
  p_description text default null,
  p_image_url text default null,
  p_link_url text default null,
  p_sort_order int default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  select branch_id into v_branch_id
  from public.branch_highlights
  where id = p_highlight_id;

  if v_branch_id is null then
    raise exception 'Highlight not found';
  end if;

  if not public.is_branch_leader(v_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch leaders can edit highlights';
  end if;

  if not public.is_safe_http_url(p_link_url) then
    raise exception 'Link URL must use http or https';
  end if;

  update public.branch_highlights set
    title        = coalesce(p_title, title),
    description  = coalesce(p_description, description),
    image_url    = coalesce(p_image_url, image_url),
    link_url     = coalesce(p_link_url, link_url),
    sort_order   = coalesce(p_sort_order, sort_order)
  where id = p_highlight_id;
end;
$$;

grant execute on function public.update_branch_highlight(uuid, text, text, text, text, int) to anon, authenticated, service_role;
