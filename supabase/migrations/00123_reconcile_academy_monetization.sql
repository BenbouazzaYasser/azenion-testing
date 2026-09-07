-- Migration: 00123_reconcile_academy_monetization
--
-- RECONCILIATION LAYER ONLY. No new product behavior, no data changes.
--
-- Background: the Academy lifecycle/monetization schema (courses lifecycle
-- columns, finance tables, instructor tables, academy RPCs, private
-- course-files posture) was applied to production out-of-band and was never
-- recorded in tracked migrations (the 00100-00103 files carrying it live only
-- on the stale fix/remove-updated-branch-activity branch and were superseded
-- by the 00117-00121 renumber). Tracked history therefore does not reproduce
-- production. This migration records the production-verified objects
-- idempotently so that (a) current production is untouched (every statement
-- is a no-op there) and (b) a fresh database built from migrations reproduces
-- the intended production Academy schema.
--
-- Production state verified 2026-09-07 before writing (all SELECT-only):
--   * public.courses has status / is_free / price_cents / currency plus
--     courses_status_check, courses_currency_check, courses_price_cents_check.
--   * Tables payments / entitlements / payment_allocations / refunds /
--     webhook_events / instructor_profiles / instructor_applications exist
--     with the exact columns below; all hold 0 rows.
--   * RLS is enabled on all seven tables with zero policies (service-role /
--     owner only in practice); authenticated SELECT + service_role ALL grants
--     recorded (verified on payments).
--   * Trigger ensure_free_price exists on public.courses; function bodies of
--     ensure_free_no_price(), is_instructor(), is_verified_instructor(),
--     can_manage_course(uuid), can_publish_course(uuid) and
--     can_access_course(uuid) match the definitions below verbatim.
--   * storage bucket course-files is private (public=false) with policies
--     "course managers can upload/update/delete course files" and
--     "course owner can select own files"; no public-read policy remains.
--   * Academy RPCs carry implicit PUBLIC EXECUTE (plus anon where noted).
--   * Main's 00102 bundle (instructor_verification_requests + 4 policies +
--     submit/get_my/admin_get/admin_review/can_host_live_sessions) is fully
--     wired into app code but absent on production although version 00102 is
--     recorded in schema_migrations; it is reproduced here verbatim.
--
-- Deliberate deviations from the old untracked files (documented, minimal):
--   * webhook_events gains provider_event_id (nullable text) plus
--     UNIQUE(provider, provider_event_id) for robust Phase-2 idempotency
--     (the old UNIQUE over the jsonb provider_data blob is reproduced as-is
--     for fidelity but must not be relied upon). Production holds 0 rows, so
--     this is data-safe. No provider-specific columns (e.g. chari_payment_id).
--   * Academy RPC grants are hardened on creation: authenticated +
--     service_role only (anon kept solely on is_course_manager(), which live
--     RLS policies evaluate for anon), followed by explicit REVOKEs. This
--     follows the 00122 precedent; the old files granted anon broadly.
--   * Policies use DROP IF EXISTS + CREATE (repo convention from 00119);
--     trigger uses DROP IF EXISTS + CREATE for re-runnability.
--
-- Explicitly NOT in this migration:
--   * No DROP TABLE (legacy instructor_applications / instructor_profiles are
--     empty but their removal is deferred to a separate decision).
--   * No modification of 00102, 00118, labs objects, or application code.
--   * No data migration or backfill. No INSERT/UPDATE/DELETE on user data.
--   * No currency CHECK widening (MAD decision deferred to Phase 2).
--   * No webhook_events redesign beyond provider_event_id.

-- ══════════════════════════════════════════════════════════════════════════
-- §1. courses lifecycle + pricing columns (exact recovered definitions)
-- ══════════════════════════════════════════════════════════════════════════

alter table public.courses
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  add column if not exists is_free boolean not null default true,
  add column if not exists price_cents integer not null default 0 check (price_cents >= 0),
  add column if not exists currency text not null default 'usd'
    check (currency in ('usd', 'eur', 'gbp'));

-- ── CHECK invariant: free courses have price_cents = 0, paid courses have price_cents > 0 ───────────────────────────────

do $$
begin
  perform 1
  from public.courses
  where (is_free = true  and price_cents != 0)
     or (is_free = false and price_cents = 0);
  if found then
    raise exception 'Existing course data violates the free/paid pricing invariant. Fix data before applying this migration.';
  end if;
end
$$;

-- ── Index for status-based queries ─────────────────────────────────────────

create index if not exists idx_courses_status on public.courses(status);

-- ── Trigger: enforce free/paid pricing invariant on every update ─────────────

create or replace function public.ensure_free_no_price()
returns trigger
language plpgsql
stable
as $$
begin
  if new.is_free = true and (new.price_cents != 0 or new.currency is null) then
    raise exception 'Free courses must have price_cents = 0';
  end if;
  if new.is_free = false and new.price_cents <= 0 then
    raise exception 'Paid courses must have price_cents > 0';
  end if;
  return new;
end
$$;

drop trigger if exists ensure_free_price on public.courses;
create trigger ensure_free_price
  before update on public.courses
  for each row
  execute function public.ensure_free_no_price();

-- ── Comment ─────────────────────────────────────────────────────────────────

comment on column public.courses.status is 'Course lifecycle status: draft | published | archived';
comment on column public.courses.is_free is 'Whether the course is free or paid; independent of status';
comment on column public.courses.price_cents is 'Price in cents; 0 for free courses, > 0 for paid courses; no artificial ceiling';
comment on column public.courses.currency is 'Currency for priced courses; usd, eur, or gbp';

-- ══════════════════════════════════════════════════════════════════════════
-- §2. Finance + instructor tables (exact recovered definitions)
-- ══════════════════════════════════════════════════════════════════════════
-- NOTE: instructor_profiles / instructor_applications are legacy (empty,
-- superseded by the §5 verification-requests model) but reproduced here so a
-- fresh database matches production. Their removal is a separate decision;
-- this file must not drop them.

-- ── Table: public.payments ─────────────────────────────────────────────────
-- Payment state machine; FK to profiles uses ON DELETE RESTRICT.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  course_id uuid references public.courses(id) on delete restrict,
  amount_cents integer not null default 0,
  currency text not null default 'usd' check (currency in ('usd', 'eur', 'gbp')),
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  provider text not null default 'stripe',
  provider_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ── Table: public.entitlements ─────────────────────────────────────────────
-- Canonical access primitive for paid courses. One entitlement per user
-- per course. FK to profiles and courses both use ON DELETE RESTRICT.

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (user_id, course_id)
);

-- ── Table: public.payment_allocations ──────────────────────────────────────
-- Immutable economic events: initial allocation, refund allocation, clawback
-- allocation. Uniqueness includes allocation_type to support multiple
-- allocations per payment. FK to payments and courses use ON DELETE RESTRICT.
-- NOTE: Do NOT create unique(payment_id, course_id); the stronger model
-- unique(payment_id, allocation_type, course_id) supports immutable initial,
-- refund, and clawback records without contradiction.

create table if not exists public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  beneficiary_user_id uuid not null references public.profiles(id) on delete restrict,
  beneficiary_type text not null default 'student' check (beneficiary_type in ('student', 'instructor')),
  amount_cents integer not null,
  allocation_type text not null check (allocation_type in ('initial', 'refund', 'clawback')),
  payout_status text not null default 'completed' check (payout_status in ('completed', 'failed', 'pending')),
  created_at timestamptz not null default now(),
  unique (payment_id, allocation_type, course_id)
);

-- ── Table: public.refunds ──────────────────────────────────────────────────
-- Refund events; never mutates historical allocation rows.
-- FK to payment_allocations uses ON DELETE RESTRICT.

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references public.payment_allocations(id) on delete restrict,
  amount_cents integer not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'processed', 'rejected')),
  created_at timestamptz not null default now()
);

-- ── Table: public.webhook_events ───────────────────────────────────────────
-- Provider-neutral webhook foundations. Reproduces the production table
-- exactly (including its UNIQUE over the provider_data blob, kept for
-- fidelity but not to be relied upon), plus the provider_event_id column
-- required for robust Phase-2 idempotency:
--   * nullable so historical / manually recorded rows stay valid
--     (production holds 0 rows, so this is data-safe either way);
--   * UNIQUE(provider, provider_event_id) is strict for real provider events
--     while Postgres treats distinct NULLs as non-conflicting.
-- No provider-specific columns (e.g. chari_payment_id) are added here.

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,
  provider_data jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'processed', 'failed')),
  processed_at timestamptz,
  -- provider_event_id is a 00123 addition (see below); listed here so fresh
  -- databases build the intended shape in one step.
  provider_event_id text,
  unique (provider, event_type, provider_data)
);

alter table public.webhook_events
  add column if not exists provider_event_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'webhook_events_provider_event_unique'
  ) then
    alter table public.webhook_events
      add constraint webhook_events_provider_event_unique
      unique (provider, provider_event_id);
  end if;
end
$$;

-- ── Table: public.instructor_profiles ──────────────────────────────────────
-- LEGACY (see file header): trusted instructor tracking; referenced by
-- is_verified_instructor(). Empty on production; removal deferred.

create table if not exists public.instructor_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  trust_level integer not null default 0 check (trust_level >= 0),
  verified_at timestamptz,
  unique (profile_id)
);

-- ── Table: public.instructor_applications ──────────────────────────────────
-- LEGACY (see file header): applications never grant privileges by
-- themselves. Empty on production; removal deferred.

create table if not exists public.instructor_applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  audit_note text,
  created_at timestamptz not null default now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────

create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_course_id on public.payments(course_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_entitlements_user_id on public.entitlements(user_id);
create index if not exists idx_entitlements_course_id on public.entitlements(course_id);
create index if not exists idx_entitlements_status on public.entitlements(status);
create index if not exists idx_payment_allocations_payment_id on public.payment_allocations(payment_id);
create index if not exists idx_payment_allocations_course_id on public.payment_allocations(course_id);
create index if not exists idx_payment_allocations_allocation_type on public.payment_allocations(allocation_type);
create index if not exists idx_refunds_allocation_id on public.refunds(allocation_id);
create index if not exists idx_refunds_status on public.refunds(status);
create index if not exists idx_webhook_events_provider on public.webhook_events(provider);
create index if not exists idx_webhook_events_event_type on public.webhook_events(event_type);
create index if not exists idx_webhook_events_provider_event_id on public.webhook_events(provider_event_id);
create index if not exists idx_instructor_profiles_profile_id on public.instructor_profiles(profile_id);
create index if not exists idx_instructor_applications_profile_id on public.instructor_applications(profile_id);
create index if not exists idx_instructor_applications_status on public.instructor_applications(status);

-- ══════════════════════════════════════════════════════════════════════════
-- §3. RLS enablement (no-op where already enabled; required on fresh DBs)
-- ══════════════════════════════════════════════════════════════════════════
-- NOTE: no user-facing policies are created here by design. With RLS on and
-- no policies these tables are service-role/owner only, matching production.
-- Application read policies arrive with the Phase-2 payment implementation.

alter table public.payments enable row level security;
alter table public.entitlements enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.refunds enable row level security;
alter table public.webhook_events enable row level security;
alter table public.instructor_profiles enable row level security;
alter table public.instructor_applications enable row level security;

-- ══════════════════════════════════════════════════════════════════════════
-- §4. Table grants (exact recovered posture; GRANT is idempotent)
-- ══════════════════════════════════════════════════════════════════════════

grant select, insert, update, delete on public.payments to service_role;
grant select on public.payments to authenticated;
grant all on public.entitlements to service_role;
grant select on public.entitlements to authenticated;
grant all on public.payment_allocations to service_role;
grant select on public.payment_allocations to authenticated;
grant all on public.refunds to service_role;
grant select on public.refunds to authenticated;
grant all on public.webhook_events to service_role;
grant select on public.webhook_events to authenticated;
grant all on public.instructor_profiles to service_role;
grant select on public.instructor_profiles to authenticated;
grant all on public.instructor_applications to service_role;
grant select on public.instructor_applications to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- §5. Academy authorization RPCs (exact recovered bodies, verified live)
-- ══════════════════════════════════════════════════════════════════════════
-- Function bodies below were verified byte-equivalent against production
-- (prosrc comparison, 2026-09-07); CREATE OR REPLACE therefore converges.
-- Grants are hardened relative to the old files (authenticated +
-- service_role; anon kept solely on is_course_manager() in §8): the old
-- broad anon grants are removed by the REVOKEs in §8.

-- ── RPC: public.is_instructor() ──────────────────────────────────────────
-- Role-only instructor check. Returns true if the caller holds the 'instructor'
-- role in public.user_roles joined with public.roles.

create or replace function public.is_instructor()
returns boolean
language sql security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'instructor'
  );
$$;

grant execute on function public.is_instructor()
  to authenticated, service_role;

-- ── RPC: public.is_verified_instructor() ─────────────────────────────────
-- Instructor role + trusted instructor_profiles.

create or replace function public.is_verified_instructor()
returns boolean
language sql security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'instructor'
  )
  and exists (
    select 1 from public.instructor_profiles ip
    where ip.profile_id = auth.uid() and ip.trust_level >= 1
  );
$$;

grant execute on function public.is_verified_instructor()
  to authenticated, service_role;

-- ── RPC: public.can_manage_course(course_id) ─────────────────────────────
-- Platform admin OR course owner (created_by = auth.uid()) OR staff manager.

create or replace function public.can_manage_course(course_id uuid)
returns boolean
language sql security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.courses c
    where c.id = course_id
      and (
        c.created_by = auth.uid()  -- course owner
        or public.is_platform_admin()  -- platform admin
        or public.is_course_manager()  -- staff manager (core_team_member + platform admin)
      )
  );
$$;

grant execute on function public.can_manage_course(uuid)
  to authenticated, service_role;

-- ── RPC: public.can_access_course(course_id) ────────────────────────────
-- THE canonical access boundary of the recovered design. (Application code
-- must not treat it as the access layer; the file route + RLS is canonical.
-- It is recorded here for fidelity and hardened in §8.)
-- Returns exactly one boolean. Anonymous: only published + free courses are
-- accessible. Authenticated: owner + staff + active entitlement + free.

create or replace function public.can_access_course(course_id uuid)
returns boolean
language sql security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.courses c
    where c.id = course_id
      and (
        -- Anonymous: only published + free courses are accessible
        (auth.role() = 'anonymous' AND c.status = 'published' AND c.is_free = true)
        OR
        -- Authenticated users: full authorization
        (
          auth.role() != 'anonymous'
          AND (
            -- Course owner retains access
            c.created_by = auth.uid()
            OR
            -- Staff manager
            public.is_course_manager()
            OR
            -- Active entitlement for paid courses
            exists (
              select 1 from public.entitlements e
              where e.course_id = course_id
                and e.user_id = auth.uid()
                and e.status = 'active'
            )
            OR
            -- Published + free (also accessible to authenticated users)
            (c.status = 'published' AND c.is_free = true)
          )
        )
      )
  );
$$;

grant execute on function public.can_access_course(uuid)
  to authenticated, service_role;

-- ── RPC: public.can_publish_course(course_id) ────────────────────────────
-- Owner OR staff/admin authorization.
-- Does NOT block owner publication on trust_level.
-- New instructors publishing their own courses are authorized by ownership alone.

create or replace function public.can_publish_course(course_id uuid)
returns boolean
language sql security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.courses c
    where c.id = course_id
      and (
        c.created_by = auth.uid()  -- course owner (authorizes regardless of trust_level)
        or public.is_platform_admin()  -- platform admin
        or public.is_course_manager()  -- staff manager
      )
  );
$$;

grant execute on function public.can_publish_course(uuid)
  to authenticated, service_role;

comment on function public.is_instructor() is
  'Role-only instructor check; checks public.user_roles joined with public.roles where name = instructor';

comment on function public.is_verified_instructor() is
  'Instructor role + trusted instructor_profiles with trust_level >= 1';

comment on function public.can_manage_course(uuid) is
  'Platform admin OR course owner (created_by = auth.uid()) OR staff manager (is_course_manager)';

comment on function public.can_access_course(uuid) is
 'THE canonical access boundary of the recovered design.
  - Course existence is a prerequisite; non-existent returns false.
  - Anonymous: only published + free courses are accessible.
  - Authenticated: owner + staff + active entitlement + published + free.';

comment on function public.can_publish_course(uuid) is
  'Owner OR staff/admin authorization.
   Does NOT block owner publication on trust_level.
   New instructors publishing their own courses are authorized by ownership alone.';

-- ══════════════════════════════════════════════════════════════════════════
-- §6. Canonical instructor-verification model (00102 bundle, verbatim)
-- ══════════════════════════════════════════════════════════════════════════
-- Instructor verification system for Academy.
-- Users apply, platform admins review, verified instructors get the 'instructor' platform role.
-- This bundle is fully wired into app code (actions/instructor-verification.actions.ts
-- + admin UI) but absent on production although version 00102 is recorded;
-- it is reproduced here verbatim (policies via DROP IF EXISTS + CREATE per
-- repo convention). 00102 itself is not modified.

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
drop policy if exists "users can read own verification requests" on public.instructor_verification_requests;
create policy "users can read own verification requests"
  on public.instructor_verification_requests for select
  using (auth.uid() = user_id);

-- Platform admins can read all
drop policy if exists "platform admins can read all verification requests" on public.instructor_verification_requests;
create policy "platform admins can read all verification requests"
  on public.instructor_verification_requests for select
  using (public.is_platform_admin());

-- Users can create their own request (one at a time)
drop policy if exists "users can create verification request" on public.instructor_verification_requests;
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
drop policy if exists "platform admins can update verification requests" on public.instructor_verification_requests;
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

-- ══════════════════════════════════════════════════════════════════════════
-- §7. Storage: private course-files bucket + owner SELECT (convergent)
-- ══════════════════════════════════════════════════════════════════════════
-- Production already runs this posture (bucket private, public-read policy
-- gone, owner + manager policies live). Tracked 00095 creates the bucket
-- PUBLIC with a public SELECT policy, so a fresh database needs both the
-- removal and the private posture recorded here. Manager upload/update/delete
-- policies are tracked in 00095 and live on production; they are NOT touched.

-- ── Make course-files bucket private ───────────────────────────────────────

update storage.buckets set public = false where id = 'course-files';

-- ── Drop the unrestricted public SELECT policy (tracked in 00095) ──────────

drop policy if exists "course files are publicly readable" on storage.objects;

-- ── Owner SELECT policy ────────────────────────────────────────────────────
-- Path format: courses/${creatorUserId}/${uuid}.{ext}
-- [2] extracts the creator user ID. Thumbnails (courses/${courseId}/...)
-- are NOT covered; they go exclusively through the API authorization flow.

drop policy if exists "course owner can select own files" on storage.objects;
create policy "course owner can select own files"
  on storage.objects for select using (
    bucket_id = 'course-files'
    and (storage.foldername(name))[2]::text = auth.uid()::text
  );

comment on policy "course owner can select own files" on storage.objects is
  'Allows the course creator (auth.uid() matching the 2nd segment of the path)'
  'to directly select objects from the private course-files bucket. Thumbnails'
  ' are NOT covered by this policy; they go through the API authorization flow.';

-- ══════════════════════════════════════════════════════════════════════════
-- §8. Academy RPC grant hardening (follows the 00122 precedent)
-- ══════════════════════════════════════════════════════════════════════════
-- The implicit PUBLIC EXECUTE that every CREATE FUNCTION grants is revoked on
-- all six signatures. anon is additionally revoked where the RLS/code audit
-- confirmed no legitimate path; is_course_manager() keeps anon/authenticated
-- because live courses + storage RLS policies evaluate it for anon.
-- REVOKE of an absent grant succeeds with a warning, so these statements are
-- safe on both production (grant present) and fresh databases.

-- is_course_manager(): keep anon/authenticated/service_role, drop PUBLIC.
revoke execute on function public.is_course_manager() from public;
grant execute on function public.is_course_manager() to anon, authenticated, service_role;

-- can_access_course(uuid): no live policy or app path; authenticated + service_role only.
revoke execute on function public.can_access_course(uuid) from public;
revoke execute on function public.can_access_course(uuid) from anon;
grant execute on function public.can_access_course(uuid) to authenticated, service_role;

-- can_manage_course(uuid): authenticated + service_role only.
revoke execute on function public.can_manage_course(uuid) from public;
revoke execute on function public.can_manage_course(uuid) from anon;
grant execute on function public.can_manage_course(uuid) to authenticated, service_role;

-- can_publish_course(uuid): authenticated + service_role only.
revoke execute on function public.can_publish_course(uuid) from public;
revoke execute on function public.can_publish_course(uuid) from anon;
grant execute on function public.can_publish_course(uuid) to authenticated, service_role;

-- is_instructor(): authenticated + service_role only.
revoke execute on function public.is_instructor() from public;
revoke execute on function public.is_instructor() from anon;
grant execute on function public.is_instructor() to authenticated, service_role;

-- is_verified_instructor(): authenticated + service_role only.
revoke execute on function public.is_verified_instructor() from public;
revoke execute on function public.is_verified_instructor() from anon;
grant execute on function public.is_verified_instructor() to authenticated, service_role;

-- ── End of migration ────────────────────────────────────────────────────────
