# Azenion — Landing Page (V1)

Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui + lucide-react.
No other dependencies.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

See `public/fonts/README.md` before shipping — Proxima Nova is a licensed
font and needs your own font files dropped in; the site works and looks
correct without them (it falls back to Inter), but the exact brand wordmark
needs the real files.

## Structure

```
app/
  layout.tsx        Root layout: fonts, metadata, grain overlay
  page.tsx           Landing page composition
  globals.css        Tailwind layers, @font-face, base styles

components/
  layout/            Navbar, Footer — used on every page
  sections/           Hero, Features, Institutions — landing-page-specific
  graphics/           Logo, InfinityHeroArt, particle data
  ui/                 shadcn/ui-style primitives (Button, Badge)

data/                 Content as data (nav links, features, institutions) —
                      edit these to change copy without touching JSX

lib/
  utils.ts            cn() class-merge helper
```

## Design tokens

Defined once in `tailwind.config.ts` — colors (`void`, `surface`, `accent`,
`ink`, `dust`), motion (`fade-in-up`, `drift-slow`, `pulse-glow`, `twinkle`),
and the `display` / `sans` font stacks. Pull from these tokens rather than
hardcoding new hex values or timings as the site grows.

## The hero artwork

`components/graphics/infinity-hero-art.tsx` is pure SVG + CSS — no bitmap
image. It reuses the exact bezier curve from the brand mark (`public/logo.svg`)
scaled up, so the hero visual and the logo are provably the same shape. All
motion in it respects `prefers-reduced-motion` (handled globally in
`globals.css`), and it's a plain component, so it can be reused elsewhere in
the platform (a future About page, loading states, OG image generation, etc.)
without duplicating the artwork.

## What's intentionally out of scope for V1

The navbar and footer link to `/about`, `/branches`, `/teams`, `/projects`,
`/showcase`, `/announcements`, `/contact`, `/login`, and `/join` — none of
these routes exist yet. This is deliberate: the brief asked for the landing
page, built so that adding those pages later is just adding `app/<route>/page.tsx`
files that reuse `Navbar`, `Footer`, and the `ui/` primitives already here.
