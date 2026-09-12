-- Migration: 00131_drop_payment_tables
--
-- Removes the Chari/payment-only finance tables (verified 0 rows in
-- production on 2026-09-12). FK-safe order (all FKs ON DELETE RESTRICT):
-- refunds -> payment_allocations -> payments -> entitlements ->
-- webhook_events. Indexes, constraints, RLS policies, and grants attached
-- to these tables are removed with them.
--
-- Preserved: rate_limit_attempts (generic, reused), instructor_profiles,
-- instructor_applications, instructor_verification_requests, and all
-- course/lab tables. Design archived at
-- docs/archive/payments-chari-2026/ before removal.

-- ── RLS policy on entitlements (00125) ───────────────────────────────────

drop policy if exists "users can read own entitlements" on public.entitlements;

-- ── Tables (children first) ─────────────────────────────────────────────

drop table if exists public.refunds;
drop table if exists public.payment_allocations;
drop table if exists public.payments;
drop table if exists public.entitlements;
drop table if exists public.webhook_events;
