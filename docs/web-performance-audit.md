# Web Performance Audit — Home Page Optimization

Date: 2026-09-14
Scope: Azenion web app (Next.js 16 / React 19, prod build, served on `:3100`)
Method: trace the production server (no dev-mode interference), compare before/after.

## Measured improvements

| Metric | Before | After | Change |
| --- | --- | --- | --- |
| TTFB | 2614 ms | **79 ms** | **−97%** |
| LCP | 4417 ms | **2172 ms** | **−51%** |
| CLS | 0.59 | **0.01** | **−98%** |
| Render-blocking Google Fonts `@import` | 1 request | removed | fonts self-hosted |

JS transfer unchanged (~331 KB gz / 22 chunks). HTML stays fully dynamic (per-cookie language SSR preserved).

## Why route-level ISR was abandoned

The home page tree calls `serverT` (from `lib/translation/server.ts`) in every section
(Hero, About, Features, PageBridge, AcademyPreview, FeedPreview, Footer). `serverT`
reads the visitor's language via `await cookies()`, which marks the `/` route as
**dynamic** in the Next.js build (`ƒ /`). Route-level caching would bake a single
language for all visitors, breaking Arabic/French SSR.

Fix: keep the page dynamic and cache the expensive data layer instead.

## Change 1 — Cache the Supabase query layer (`app/page.tsx`)

- Removed `export const dynamic = "force-dynamic"` and `export const revalidate = 300`.
- Extracted all server data work (teams, projects, sessions, counters, branches,
  feed items, signed-URL resolution) into `fetchHomePageData()`.
- Wrapped it in `unstable_cache(fetchHomePageData, ["home-page-data"], { revalidate: 30 })`.
- Switched media/logo resolution from the cookie-bound `createClient` to the
  cache-safe `admin` client (`createAdminClient`).

Signed-URL safety margin: media URLs carry a 60-second TTL (`SIGNED_URL_TTL_SECONDS`
in `lib/media.ts`). Revalidating every 30s guarantees every cached URL still has at
least 30s of life left.

Verification: repeated identical responses (~670–840 ms full round-trip including
~461 KB HTML) with no Supabase query cost. Arabic SSR confirmed intact
(9002 Arabic chars rendered with `azenion-lang=ar` cookie).

## Change 2 — Kill the 0.59 CLS (`components/graphics/page-atmosphere.tsx`)

The atmosphere layer defaulted to `absolute inset-0`, so its blob/node positions
re-anchored as the page grew, causing big layout shifts.

Changed default to `pointer-events-none fixed inset-0`. Verified it stays visually
identical, sits directly under the `z-50` navbar (no overlap), and does not create
horizontal overflow on any checked route.

## Change 3 — Self-hosted fonts (`app/layout.tsx`, `app/globals.css`)

Removed the render-blocking Google Fonts `@import` at the top of `globals.css`.

The usual `media="print" onload` swap trick is not usable here (React 19 Server
Components reject event handlers on `<link>`). Instead used `next/font/google`:

- `Tajawal` (400/500/700) and `Noto Naskh Arabic` (400/500/600), subsets
  latin + arabic, `display: swap`, exposed as CSS variables.
- Variables `--font-tajawal` / `--font-noto-naskh` applied on `<html>`.
- `globals.css` Arabic stack updated to use the variables, keeping `--font-inter`
  fallback for Latin UI.

Result: zero external font requests; woff2 files bundled with the build
(~173 KB, 8 files).

## Health gates (all green)

- `npm run typecheck` — passes
- `npm run test` — 60 tests pass
- `npm run lint` — unchanged from baseline (87 errors / 90 warnings, all
  pre-existing; none in changed files)
- `npm run build` — succeeds
- verified `/`, `/about`, `/feed` render with the new atmosphere/fonts/data path

## Remaining opportunities (not done)

1. **Render delay ~2 s is now the dominant LCP factor** — the LCP element is the
   hero CTA/text, blocked by client hydration/React render of the large home tree.
2. JS bundle ~331 KB gz — trimming is possible but a bigger, riskier change.
3. Nav-link `_rsc` prefetch of all home sections on load.

These were intentionally left untouched per the plan (no unmeasured rewrites,
no JS/prefetch changes in this pass).