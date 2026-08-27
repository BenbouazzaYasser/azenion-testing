-- Migration: 00105_add_instructor_education_certifications
--
-- Adds education and certifications fields to instructor verification requests.
-- Also ensures platform_roles infrastructure exists for the approve flow.

-- ── Platform roles safety net (from 00100) ───────────────────────────────────

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.roles enable row level security;

do $$ begin
  create policy "roles are publicly readable"
    on public.roles for select using (true);
exception when duplicate_object then null;
end $$;

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

alter table public.user_roles enable row level security;

do $$ begin
  create policy "user roles are publicly readable"
    on public.user_roles for select using (true);
exception when duplicate_object then null;
end $$;

create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_role_id on public.user_roles(role_id);

alter table public.roles add column if not exists is_system boolean not null default false;

-- Back-compat: older DBs (00093) created user_roles without assigned_by.
-- Ensure missing columns exist before the grant_platform_role function that uses them.
alter table public.user_roles add column if not exists assigned_by uuid references public.profiles(id) on delete set null;
alter table public.user_roles add column if not exists assigned_at timestamptz not null default now();
alter table public.user_roles add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.user_roles add column if not exists role_id uuid references public.roles(id) on delete cascade;
-- is_system on roles already handled above; ensure roles table has description/created_at for parity
alter table public.roles add column if not exists description text;
alter table public.roles add column if not exists created_at timestamptz not null default now();

-- Seed the instructor role if it doesn't exist
insert into public.roles (name, description, is_system)
values ('instructor', 'Verified instructor with teaching privileges', true)
on conflict (name) do nothing;

-- Ensure is_platform_admin overload exists (required by has_platform_role)
-- Original function in 00028 is is_platform_admin() with no args; this adds the uuid overload
-- so has_platform_role(p_role, p_user_id) can check arbitrary users.
create or replace function public.is_platform_admin(p_user_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.platform_admins where user_id = p_user_id
  );
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.is_platform_admin(auth.uid());
$$;

grant execute on function public.is_platform_admin(uuid) to anon, authenticated, service_role;
grant execute on function public.is_platform_admin() to anon, authenticated, service_role;

create or replace function public.has_platform_role(
  p_role_name text,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    public.is_platform_admin(p_user_id)
    or exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = p_user_id
        and r.name = p_role_name
    );
$$;

grant execute on function public.has_platform_role(text, uuid)
  to anon, authenticated, service_role;

create or replace function public.grant_platform_role(
  p_user_id uuid,
  p_role_name text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_role_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Only platform admins can grant platform roles';
  end if;

  select id into v_role_id
  from public.roles
  where name = p_role_name;

  if v_role_id is null then
    raise exception 'Role not found: %', p_role_name;
  end if;

  insert into public.user_roles (user_id, role_id, assigned_by)
  values (p_user_id, v_role_id, auth.uid())
  on conflict (user_id, role_id) do nothing;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'granted_platform_role',
    jsonb_build_object('target_user_id', p_user_id, 'role_name', p_role_name)
  );
end;
$$;

grant execute on function public.grant_platform_role(uuid, text)
  to authenticated, service_role;

-- ── Add columns ──────────────────────────────────────────────────────────────

alter table public.instructor_verification_requests
  add column if not exists education jsonb default '[]'::jsonb;

alter table public.instructor_verification_requests
  add column if not exists certifications jsonb default '[]'::jsonb;

-- ── Update submit_instructor_verification RPC ────────────────────────────────

create or replace function public.submit_instructor_verification(
  p_full_name text,
  p_bio text,
  p_expertise_areas text[],
  p_teaching_experience text default null,
  p_portfolio_url text default null,
  p_linkedin_url text default null,
  p_github_url text default null,
  p_education jsonb default '[]'::jsonb,
  p_certifications jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_request_id uuid;
begin
  if public.has_platform_role('instructor'::text) then
    raise exception 'You are already a verified instructor';
  end if;

  if exists (
    select 1 from public.instructor_verification_requests
    where user_id = auth.uid() and status in ('pending', 'needs_info')
  ) then
    raise exception 'You already have a pending verification request';
  end if;

  insert into public.instructor_verification_requests (
    user_id, full_name, bio, expertise_areas,
    teaching_experience, portfolio_url, linkedin_url, github_url,
    education, certifications
  ) values (
    auth.uid(), p_full_name, p_bio, p_expertise_areas,
    p_teaching_experience, p_portfolio_url, p_linkedin_url, p_github_url,
    p_education, p_certifications
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

grant execute on function public.submit_instructor_verification(text, text, text[], text, text, text, text, jsonb, jsonb)
  to authenticated, service_role;

-- ── Update get_my_instructor_verification RPC ────────────────────────────────

drop function if exists public.get_my_instructor_verification();

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
  education jsonb,
  certifications jsonb,
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
    education, certifications,
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

-- ── Update admin_get_verification_requests RPC ───────────────────────────────

drop function if exists public.admin_get_verification_requests(text, int, int);

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
  education jsonb,
  certifications jsonb,
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
    ivr.education,
    ivr.certifications,
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

-- ── Recreate admin_review_instructor_verification (calls grant_platform_role) ─

drop function if exists public.admin_review_instructor_verification(uuid, text, text);

create or replace function public.admin_review_instructor_verification(
  p_request_id uuid,
  p_action text,
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
