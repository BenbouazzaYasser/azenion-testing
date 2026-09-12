-- Migration: 00132_drop_course_pricing_columns
--
-- Removes payment/pricing state from public.courses. Production held 6
-- courses, all is_free=true / price_cents=0 / status='draft' (verified
-- 2026-09-12; stale currency='usd' on those rows was dead metadata), so no
-- backfill or data migration is required.
--
-- Removes: trigger ensure_free_price, function ensure_free_no_price(),
-- constraint courses_currency_check, columns is_free / price_cents /
-- currency (with their comments and inline checks).
--
-- Preserved untouched: status, created_by, file_path, file_url, thumbnail,
-- content_type, and all other course CRUD / instructor / authorization
-- fields. Design archived at docs/archive/payments-chari-2026/.

-- ── Trigger + function ──────────────────────────────────────────────────

drop trigger if exists ensure_free_price on public.courses;
drop function if exists public.ensure_free_no_price();

-- ── Currency check (rebuilt MAD-only in 00125) ──────────────────────────

alter table public.courses drop constraint if exists courses_currency_check;

-- ── Pricing columns ─────────────────────────────────────────────────────

alter table public.courses drop column if exists is_free;
alter table public.courses drop column if exists price_cents;
alter table public.courses drop column if exists currency;
