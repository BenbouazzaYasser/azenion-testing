-- Migration: 00126_rate_limit_attempts
--
-- Minimal, explicitly scoped rate-limit attempt log. Backs the
-- lib/rate-limit.ts interface used by abuse-sensitive routes (payment
-- checkout, provider webhook). Service-role-only: RLS enabled with no
-- policies, grant to service_role only.
--
-- This is NOT presented as production-grade distributed rate limiting; it is
-- the smallest durable mechanism that works on serverless without adding a
-- vendor. Rows are timestamped so old attempts can be pruned by window.

create table if not exists public.rate_limit_attempts (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  key text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_attempts_scope_key_at
  on public.rate_limit_attempts (scope, key, attempted_at);

alter table public.rate_limit_attempts enable row level security;

grant all on public.rate_limit_attempts to service_role;

comment on table public.rate_limit_attempts is
  'Minimal rate-limit attempt log (see lib/rate-limit.ts). Service-role only.';

-- ── End of migration ────────────────────────────────────────────────────────
