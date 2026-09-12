-- Migration: 00125_academy_mad_currency
--
-- MAD-only v1 for Academy monetization.
--
-- Design (approved): free courses are unconstrained by currency (currency is
-- meaningless for them), while every paid course and every payment row must
-- be MAD. This deliberately does NOT enforce CHECK (currency IN ('mad'))
-- across every course row.
--
--   * public.courses: CHECK ((is_free = true) OR (currency = 'mad')).
--     Existing free rows (whatever their currency value) conform; only paid
--     rows are constrained. Column default becomes 'mad'.
--   * public.payments: every row represents money movement, so a strict
--     CHECK (currency IN ('mad')) is semantically correct. Production holds
--     0 payment rows; a guard aborts loudly if that ever changes.
--   * Sole user-facing finance policy: users can read their own entitlements
--     (required by the purchase UI + file-route hook; everything else stays
--     service-role-only behind RLS with no policies).
--
-- Idempotent on production and fresh databases. No data backfill (none
-- needed). No unrelated schema changes.

-- ── Guard: refuse if any payment row is non-MAD ────────────────────────────

do $$
begin
  if exists (select 1 from public.payments where currency <> 'mad') then
    raise exception 'Non-MAD payment rows exist. Resolve them before applying 00125.';
  end if;
end
$$;

-- ── courses: free unconstrained, paid must be MAD ───────────────────────────

alter table public.courses drop constraint if exists courses_currency_check;
alter table public.courses
  add constraint courses_currency_check
  check ((is_free = true) or (currency = 'mad'));
alter table public.courses alter column currency set default 'mad';

comment on column public.courses.currency is 'Currency for priced courses. MAD-only in v1; free courses are unconstrained by this check.';

-- ── payments: strictly MAD ─────────────────────────────────────────────────

alter table public.payments drop constraint if exists payments_currency_check;
alter table public.payments
  add constraint payments_currency_check check (currency in ('mad'));
alter table public.payments alter column currency set default 'mad';

comment on column public.payments.currency is 'Settlement currency. MAD-only in v1.';

-- ── Entitlements: the single user-facing finance read policy ───────────────
-- Lets a signed-in user read ONLY their own entitlement rows (purchase UI
-- state, file-route access check). All other finance tables remain
-- service-role-only: RLS enabled with no policies.

drop policy if exists "users can read own entitlements" on public.entitlements;
create policy "users can read own entitlements"
  on public.entitlements for select
  using (auth.uid() = user_id);

-- ── End of migration ────────────────────────────────────────────────────────
