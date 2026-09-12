# Payments (Chari) — Removal Archive

**Status:** HISTORICAL REFERENCE ONLY. These files are documentation artifacts.
They are not importable production code (no barrel export, no build/test
references point here). Do not import from this directory.

## Why Chari was removed

Azenion will not take payments in the foreseeable future. The Chari/MAD
card-collect stack (5 finance tables + webhook + hosted-3DS return flow +
entitlement-gated file delivery) carried ongoing maintenance (4 secrets,
provider callbacks, entitlement branches) for zero revenue. The money layer
was fail-closed (`toProviderAmount` always threw `AmountUnitUnconfirmedError`
until sandbox units were confirmed), so no live collection path existed
anyway. Decision: archive the design, then remove it from the active tree.

## Production preflight (2026-09-12, read-only `supabase db query --linked`)

- `payments` = 0 rows
- `entitlements` = 0 rows
- `payment_allocations` = 0 rows
- `refunds` = 0 rows
- `webhook_events` = 0 rows
- `courses` = 6 rows total, all `is_free=true, price_cents=0, status='draft'`
- `is_free=false`: 0 · `price_cents>0`: 0 · anomalies (`is_free=false AND
  price_cents<=0`, `is_free=true AND price_cents!=0`,
  published-with-pricing): 0
- **Currency note:** the 6 existing draft courses carry the stale
  `currency='usd'` value (rows predate migration `00125`, which changed only
  the column *default* to `'mad'`). All six are free (`price_cents=0`) and
  unpublished (`status='draft'`), so this is dead metadata. **No data
  migration/backfill was required or performed.**

Verdict at removal time: GO (no blocking data).

## Publish-state access model (replacement)

Course access is now `courses.status = 'published'` enforced in the
server-mediated file route (`app/api/academy/courses/[id]/file/route.ts`):

- `published` + valid path + object exists → serve (anonymous allowed
  through the route; bucket stays private).
- `draft`/`archived` + non-manager/non-owner → 404.
- Manager (`is_course_manager()` RPC) / owner (`created_by`) → preview
  even when draft/archived (existing privileged behavior, semantics
  unchanged).
- Missing course/object → 404; malformed id/path → 400.
- No `402 Purchase required`, no entitlements, no checkout, no refunds.
- Thumbnails served by an explicit route branch
  (`courses/<courseId>/thumbnail.<img-ext>`, `image/*` inline);
  course files keep PDF-inline / octet-stream-attachment behavior.

## Environment variables retired (payment-only)

- `CHARI_API_KEY`
- `CHARI_BASE_URL`
- `CHARI_MERCHANT_PHONE`
- `CHARI_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL` (only consumer was the Chari
  `notificationUrl`/`acceptUrl`/`declineUrl` construction)

`NEXT_PUBLIC_SITE_URL` REMAINS (auth callbacks, metadata, sitemap/robots).

## Contents (verbatim copies, unmodified)

| Archived file | Original path |
|---|---|
| `migrations/00123_reconcile_academy_monetization.sql` | `supabase/migrations/00123_reconcile_academy_monetization.sql` |
| `migrations/00125_academy_mad_currency.sql` | `supabase/migrations/00125_academy_mad_currency.sql` |
| `lib-payments/access.ts` (+ `access.test.ts`) | `lib/payments/access.ts` (+ test) |
| `lib-payments/transitions.ts` (+ test) | `lib/payments/transitions.ts` (+ test) |
| `lib-payments/money.ts` (+ test) | `lib/payments/money.ts` (+ test) |
| `lib-payments/chari.server.ts` (+ test) | `lib/payments/chari.server.ts` (+ test) |
| `actions/academy-payments.actions.ts` (+ test) | `actions/academy-payments.actions.ts` (+ test) |
| `validations/payment.validation.ts` (+ test) | `lib/validations/payment.validation.ts` (+ test) |
| `api/webhook-route.ts` | `app/api/academy/payments/webhook/route.ts` |
| `api/return-route.ts` | `app/api/academy/payments/return/route.ts` |

Dropped dead RPCs (defined in `00123`, zero callers): `can_access_course(uuid)`,
`can_manage_course(uuid)`, `can_publish_course(uuid)`. Dropped tables:
`refunds → payment_allocations → payments → entitlements → webhook_events`.
Dropped columns: `courses.is_free, price_cents, currency` (+ trigger
`ensure_free_price`, function `ensure_free_no_price()`,
`courses_currency_check`). `rate_limit_attempts` was NOT payment-only and
remains. `is_course_manager()`, `is_instructor()`,
`is_verified_instructor()` and all live Academy oracles remain.

## Reintroduction guidance

To restore provider billing later: (1) re-read `migrations/00123` §§1–6 for
the table/trigger/RPC shape and `chari.server.ts` + `webhook-route.ts` for
the idempotency-first webhook (`UNIQUE(provider,provider_event_id)`,
authoritative `getOperation` verify, `decideTransition`); (2) re-read
`transitions.ts` for the grant/fail/refund state machine and `money.ts` for
the fail-closed currency discipline; (3) design a fresh migration — do NOT
re-apply these files verbatim (they encode Chari-specific assumptions and
the stale `stripe` provider default). Re-evaluate Apple/Google IAP policy
before selling courses on mobile.
