-- Migration: 00101_academy_finance_and_instructor_tables
-- Creates the core financial state machines and instructor framework.
-- Run after 00100_academy_courses_lifecycle.sql.
-- Does NOT modify any existing migration 00000–00099.

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

grant select, insert, update, delete on public.payments to service_role;
grant select on public.payments to authenticated;

-- ── Indexes on payments ────────────────────────────────────────────────────

create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_course_id on public.payments(course_id);
create index if not exists idx_payments_status on public.payments(status);

-- ── Table: public.entitlements ─────────────────────────────────────────────
-- Canonical access primitive for paid courses.
-- FK to profiles and courses both use ON DELETE RESTRICT.
-- One entitlement per user per course.

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (user_id, course_id)
);

grant all on public.entitlements to service_role;
grant select on public.entitlements to authenticated;

-- ── Indexes on entitlements ─────────────────────────────────────────────────

create index if not exists idx_entitlements_user_id on public.entitlements(user_id);
create index if not exists idx_entitlements_course_id on public.entitlements(course_id);
create index if not exists idx_entitlements_status on public.entitlements(status);

-- ── Table: public.payment_allocations ──────────────────────────────────────
-- Immutable economic events: initial allocation, refund allocation, clawback allocation.
-- Uniqueness includes allocation_type to support multiple allocations per payment.
-- FK to payments and courses both use ON DELETE RESTRICT.

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

grant all on public.payment_allocations to service_role;
grant select on public.payment_allocations to authenticated;

-- ── Indexes on payment_allocations ──────────────────────────────────────────

create index if not exists idx_payment_allocations_payment_id on public.payment_allocations(payment_id);
create index if not exists idx_payment_allocations_course_id on public.payment_allocations(course_id);
create index if not exists idx_payment_allocations_allocation_type on public.payment_allocations(allocation_type);

-- NOTE: Do NOT create unique(payment_id, course_id). The stronger model
-- unique(payment_id, allocation_type, course_id) supports immutable initial,
-- refund, and clawback records without contradiction.

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

grant all on public.refunds to service_role;
grant select on public.refunds to authenticated;

-- ── Indexes on refunds ─────────────────────────────────────────────────────

create index if not exists idx_refunds_allocation_id on public.refunds(allocation_id);
create index if not exists idx_refunds_status on public.refunds(status);

-- ── Table: public.webhook_events ───────────────────────────────────────────
-- Provider-neutral webhook foundations.

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,
  provider_data jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'processed', 'failed')),
  processed_at timestamptz,
  unique (provider, event_type, provider_data)
);

grant all on public.webhook_events to service_role;
grant select on public.webhook_events to authenticated;

-- ── Indexes on webhook_events ──────────────────────────────────────────────

create index if not exists idx_webhook_events_provider on public.webhook_events(provider);
create index if not exists idx_webhook_events_event_type on public.webhook_events(event_type);

-- ── Table: public.instructor_profiles ──────────────────────────────────────
-- Trusted instructor tracking; referenced by is_verified_instructor().

create table if not exists public.instructor_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  trust_level integer not null default 0 check (trust_level >= 0),
  verified_at timestamptz,
  unique (profile_id)
);

grant all on public.instructor_profiles to service_role;
grant select on public.instructor_profiles to authenticated;

-- ── Indexes on instructor_profiles ─────────────────────────────────────────

create index if not exists idx_instructor_profiles_profile_id on public.instructor_profiles(profile_id);

-- ── Table: public.instructor_applications ──────────────────────────────────
-- Applications never grant privileges by themselves.
-- Reviewed and approved by platform admins via admin_grant_role.

create table if not exists public.instructor_applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  audit_note text,
  created_at timestamptz not null default now()
);

grant all on public.instructor_applications to service_role;
grant select on public.instructor_applications to authenticated;

-- ── Indexes on instructor_applications ──────────────────────────────────────

create index if not exists idx_instructor_applications_profile_id on public.instructor_applications(profile_id);
create index if not exists idx_instructor_applications_status on public.instructor_applications(status);

-- ── Grants and policies ─────────────────────────────────────────────────────

-- Allow service_role full access; authenticated read-only for most tables.
-- Application-level RLS policies should be applied per the target architecture.