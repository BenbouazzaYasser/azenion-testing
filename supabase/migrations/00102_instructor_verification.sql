-- Migration: 00102_instructor_verification
--
-- Instructor verification system for Academy.
-- Users apply, platform admins review, verified instructors get the 'instructor' platform role.

-- ── Table: instructor_verification_requests ───────────────────────────────────

create table if not exists public.instructor_verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- Application fields
  full_name text not null,
  bio text not null,
  expertise_areas text[] not null default '{}',
  teaching_experience text,
  portfolio_url text,
  linkedin_url text,
  github_url text,
  -- Status workflow
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'needs_info')),
  -- Review fields
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.instructor_verification_requests enable row level security;

-- Users can read their own requests
create policy "users can read own verification requests"
  on public.instructor_verification_requests for select
  using (auth.uid() = user_id);

-- Platform admins can read all
create policy "platform admins can read all verification requests"
  on public.instructor_verification_requests for select
  using (public.is_platform_admin());

-- Users can create their own request (one at a time)
create policy "users can create verification request"
  on public.instructor_verification_requests for insert
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.instructor_verification_requests
      where user_id = auth.uid() and status in ('pending', 'needs_info')
    )
  );

-- Platform admins can update (review)
create policy "platform admins can update verification requests"
  on public.instructor_verification_requests for update
  using (public.is_platform_admin());

create index if not exists idx_ivr_user_id on public.instructor_verification_requests(user_id);
create index if not exists idx_ivr_status on public.instructor_verification_requests(status);

-- ── RPC: submit_instructor_verification ───────────────────────────────────────

create or replace function public.submit_instructor_verification(
  p_full_name text,
  p_bio text,
  p_expertise_areas text[],
  p_teaching_experience text default null,
  p_portfolio_url text default null,
  p_linkedin_url text default null,
  p_github_url text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_request_id uuid;
begin
  -- Check if user already has instructor role
  if public.has_platform_role('instructor'::text) then
    raise exception 'You are already a verified instructor';
  end if;

  -- Check for existing pending request
  if exists (
    select 1 from public.instructor_verification_requests
    where user_id = auth.uid() and status in ('pending', 'needs_info')
  ) then
    raise exception 'You already have a pending verification request';
  end if;

  insert into public.instructor_verification_requests (
    user_id, full_name, bio, expertise_areas,
    teaching_experience, portfolio_url, linkedin_url, github_url
  ) values (
    auth.uid(), p_full_name, p_bio, p_expertise_areas,
    p_teaching_experience, p_portfolio_url, p_linkedin_url, p_github_url
  )
  returning id into v_request_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'submitted_instructor_verification',
    jsonb_build_object('request_id', v_request_id)
  );

  return v_request_id;
end;
$$;

grant execute on function public.submit_instructor_verification(text, text, text[], text, text, text, text)
  to authenticated, service_role;

-- ── RPC: get_my_instructor_verification ───────────────────────────────────────

create or replace function public.get_my_instructor_verification()
returns table (
  id uuid,
  status text,
  full_name text,
  bio text,
  expertise_areas text[],
  teaching_experience text,
  portfolio_url text,
  linkedin_url text,
  github_url text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  return query
  select
    id, status, full_name, bio, expertise_areas,
    teaching_experience, portfolio_url, linkedin_url, github_url,
    reviewed_by, reviewed_at, review_notes,
    created_at, updated_at
  from public.instructor_verification_requests
  where user_id = auth.uid()
  order by created_at desc
  limit 1;
end;
$$;

grant execute on function public.get_my_instructor_verification()
  to authenticated, service_role;

-- ── RPC: admin_get_verification_requests (with pagination) ────────────────────

create or replace function public.admin_get_verification_requests(
  p_status text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  status text,
  expertise_areas text[],
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only platform admins can view verification requests';
  end if;

  return query
  select
    ivr.id,
    ivr.user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    ivr.status,
    ivr.expertise_areas,
    ivr.created_at,
    ivr.updated_at
  from public.instructor_verification_requests ivr
  join public.profiles p on p.id = ivr.user_id
  where (p_status is null or ivr.status = p_status)
  order by
    case ivr.status when 'pending' then 0 when 'needs_info' then 1 when 'approved' then 2 else 3 end,
    ivr.created_at asc
  limit p_limit offset p_offset;
end;
$$;

grant execute on function public.admin_get_verification_requests(text, int, int)
  to authenticated, service_role;

-- ── RPC: admin_review_instructor_verification ─────────────────────────────────

create or replace function public.admin_review_instructor_verification(
  p_request_id uuid,
  p_action text, -- 'approve' | 'reject' | 'needs_info'
  p_review_notes text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_request public.instructor_verification_requests%rowtype;
  v_user_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Only platform admins can review verification requests';
  end if;

  if p_action not in ('approve', 'reject', 'needs_info') then
    raise exception 'Invalid action: %', p_action;
  end if;

  select * into v_request
  from public.instructor_verification_requests
  where id = p_request_id;

  if v_request is null then
    raise exception 'Verification request not found';
  end if;

  if v_request.status not in ('pending', 'needs_info') then
    raise exception 'Request already reviewed';
  end if;

  v_user_id := v_request.user_id;

  if p_action = 'approve' then
    -- Grant instructor platform role
    perform public.grant_platform_role(v_user_id, 'instructor');

    update public.instructor_verification_requests
    set status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        review_notes = p_review_notes,
        updated_at = now()
    where id = p_request_id;

    insert into public.activities (user_id, type, metadata)
    values (
      v_user_id,
      'instructor_verification_approved',
      jsonb_build_object('request_id', p_request_id, 'reviewed_by', auth.uid())
    );

  elsif p_action = 'reject' then
    update public.instructor_verification_requests
    set status = 'rejected',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        review_notes = p_review_notes,
        updated_at = now()
    where id = p_request_id;

    insert into public.activities (user_id, type, metadata)
    values (
      v_user_id,
      'instructor_verification_rejected',
      jsonb_build_object('request_id', p_request_id, 'reviewed_by', auth.uid(), 'reason', p_review_notes)
    );

  else -- needs_info
    update public.instructor_verification_requests
    set status = 'needs_info',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        review_notes = p_review_notes,
        updated_at = now()
    where id = p_request_id;

    insert into public.activities (user_id, type, metadata)
    values (
      v_user_id,
      'instructor_verification_needs_info',
      jsonb_build_object('request_id', p_request_id, 'reviewed_by', auth.uid(), 'notes', p_review_notes)
    );
  end if;
end;
$$;

grant execute on function public.admin_review_instructor_verification(uuid, text, text)
  to authenticated, service_role;

-- ── RPC: can_host_live_sessions ───────────────────────────────────────────────
-- Unified check: platform admin OR instructor role OR branch leader OR team permission

create or replace function public.can_host_live_sessions(
  p_host_type text, -- 'BRANCH' | 'TEAM'
  p_host_id uuid
)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    public.is_platform_admin()
    or public.has_platform_role('instructor'::text)
    or (
      p_host_type = 'BRANCH'
      and public.is_branch_leader(p_host_id)
    )
    or (
      p_host_type = 'TEAM'
      and public.has_team_permission(p_host_id, 'CREATE_LIVE_SESSIONS')
    );
$$;

grant execute on function public.can_host_live_sessions(text, uuid)
  to anon, authenticated, service_role;

-- ── Grants ────────────────────────────────────────────────────────────────────

grant select, insert, update on public.instructor_verification_requests to authenticated, service_role;
grant select on public.instructor_verification_requests to anon;