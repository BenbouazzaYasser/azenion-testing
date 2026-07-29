# Azenion Website — Development Handoff

---

## Project Overview

**Azenion** is "The Limitless Network" — a global community connecting ambitious students, developers, designers, entrepreneurs, and innovators through learning, collaboration, and building impactful projects. The website serves as the brand's digital presence and landing platform.

**Vision:** A world where no ambitious person ever has to build alone. Where ideas find their teams, projects find their audience, and talent finds its path.

**Tech Stack:**
- Next.js 14 (App Router)
- TypeScript (strict mode, `noUncheckedIndexedAccess`)
- Tailwind CSS 3.4
- `lucide-react` (icons)
- `@radix-ui/react-slot` (for Button `asChild`)
- `clsx` + `tailwind-merge` (class merging via `cn()`)
- `class-variance-authority` (component variants)

**Design Philosophy:** Dark, space-inspired, cosmic aesthetic. Minimalist but not sparse. Premium, handcrafted, cinematic. Feels like a carefully designed product experience, not a template.

**Brand Identity:**
- Tagline: _"Infinite minds. Limitless impact."_
- Primary accent: `rgb(40, 40, 255)` (#2828FF)
- Core symbol: Infinity (∞) — used in logo, hero artwork
- Voice: Inspirational, elegant, human. Avoids startup clichés.
- Audience: Ambitious students and builders who care about craft.

---

## Current Architecture

### Folder Structure

```
azenion/
├── app/
│   ├── about/
│   │   └── page.tsx            # /about route
│   ├── globals.css              # Tailwind layers, @font-face, base styles
│   ├── layout.tsx               # Root layout (Inter font, grain overlay)
│   └── page.tsx                 # / route (landing page)
├── components/
│   ├── graphics/
│   │   ├── infinity-hero-art.tsx # SVG infinity symbol with particle fields
│   │   ├── infinity-particles.ts # Deterministic particle coordinates
│   │   └── logo.tsx             # Brand logo (Next/Image + wordmark)
│   ├── layout/
│   │   ├── footer.tsx           # Site footer
│   │   └── navbar.tsx           # Fixed floating pill navbar
│   ├── sections/
│   │   ├── about/
│   │   │   ├── hero.tsx         # About page hero
│   │   │   ├── our-story.tsx    # Timeline narrative
│   │   │   ├── our-mission.tsx  # 3 mission cards
│   │   │   ├── core-values.tsx  # 6 values grid
│   │   │   ├── who-belongs.tsx  # 8 role cards
│   │   │   ├── ecosystem.tsx    # 6 connected flow cards
│   │   │   ├── vision.tsx       # Cinematic vision section
│   │   │   └── closing-cta.tsx  # Closing CTA
│   │   ├── about.tsx            # LP "About Azenion" section
│   │   ├── features.tsx         # LP features (4 columns)
│   │   ├── hero.tsx             # LP hero
│   │   ├── institutions.tsx     # LP trusted-by section
│   │   └── page-bridge.tsx      # Cosmic transition bridge
│   └── ui/
│       ├── badge.tsx            # Badge primitive
│       ├── button.tsx           # Button with CVA variants
│       └── reveal.tsx           # Scroll-reveal animation wrapper
├── data/
│   ├── about.ts                 # About page content (missions, values, roles, ecosystem)
│   ├── features.ts              # Feature card content
│   ├── institutions.ts          # Institution names
│   └── nav-links.ts             # Navigation link definitions
├── lib/
│   └── utils.ts                 # cn() class-merge helper
├── public/
│   ├── fonts/                   # Proxima Nova font files (placeholders)
│   ├── logo.svg                 # Brand mark (infinity symbol)
│   └── noise.svg                # Grain texture overlay
└── [config files]               # tailwind.config.ts, next.config.mjs, tsconfig.json, etc.
```

### Important Components

| Component | Type | Purpose |
|---|---|---|
| `Navbar` | Client | Fixed floating pill, scroll-aware, active link detection via `usePathname`, mobile hamburger menu |
| `Footer` | Server | Logo, tagline, filtered nav links, social icons (X/LinkedIn/Instagram), copyright |
| `Button` | Server (forwardRef) | CVA-powered, 3 variants (primary/secondary/ghost), 3 sizes (default/sm/lg), supports `asChild` |
| `Badge` | Server | Inline pill badge with border and glass background |
| `Reveal` | Client | IntersectionObserver-based scroll-reveal, configurable delay and `once` behavior |
| `Logo` | Server | Renders `logo.svg` via Next/Image, optional "AZENION" wordmark |
| `InfinityHeroArt` | Server | SVG infinity symbol with particle fields, multiple blur layers, animated glow |
| `PageBridge` | Server | Cosmic gradient bridge with floating dot particles |

### Shared UI Primitives

Located in `components/ui/`:
- **Button** — `variant: "primary" | "secondary" | "ghost"`, `size: "default" | "sm" | "lg"`
- **Badge** — Simple inline pill with border and glass bg
- **Reveal** — Wrapper component for scroll-triggered fade-in-up animation

### Data Layer

Content is decoupled from JSX in `data/` files. Each file exports typed constants:
- `NAV_LINKS: NavLink[]` — 8 navigation links (Home, About, Branches, Teams, Projects, Showcase, Announcements, Contact)
- `FEATURES: Feature[]` — 4 feature cards (Connect, Collaborate, Innovate, Elevate)
- `INSTITUTIONS: Institution[]` — 5 partner institutions (EMSI, ENSA, UM6P, UM5, UIT)
- `MISSION_CARDS: MissionCard[]` — 3 mission pillars
- `CORE_VALUES: CoreValue[]` — 6 core values
- `ROLES: Role[]` — 8 role types
- `ECOSYSTEM_ITEMS: EcosystemItem[]` — 6 ecosystem stages

### Routing

| Route | File | Status |
|---|---|---|
| `/` | `app/page.tsx` | ✅ Built |
| `/about` | `app/about/page.tsx` | ✅ Built |
| `/branches` | — | ❌ Not built |
| `/teams` | — | ❌ Not built |
| `/projects` | — | ❌ Not built |
| `/showcase` | — | ❌ Not built |
| `/announcements` | — | ❌ Not built |
| `/contact` | — | ❌ Not built |
| `/join` | — | ❌ Not built |
| `/login` | — | ❌ Not built |

### Styling System

- **Tailwind CSS** with a custom config extending `theme` with brand colors, fonts, shadows, keyframes
- **`cn()` utility** (`clsx` + `tailwind-merge`) used throughout for conditional classes
- **No CSS modules or styled-components** — all styling is inline Tailwind via `className`
- **Global styles** in `globals.css` using Tailwind layers (`@layer base`, `@layer utilities`)

### Fonts

| Font | Usage | Source |
|---|---|---|
| **Inter** | Body text (`font-sans`) | Google Fonts via `next/font/google`, CSS variable `--font-inter` |
| **Proxima Nova** | Display/wordmark (`font-display`) | Self-hosted (files not included — licensed font). Falls back to Inter, then system sans |

### Theme

- **Dark-only** (`color-scheme: dark` in `:root`)
- **Background:** `bg-void-950` (#050507) with subtle radial gradient overlays
- **Grain overlay:** `bg-grain` (CSS class pointing to `public/noise.svg`) with 2.5% opacity, `mix-blend-overlay`
- **Focus ring:** `rgb(40 40 255 / 0.8)` outline, visible only on keyboard navigation via `:focus-visible`

### Animation System

**Keyframes** (all defined in `tailwind.config.ts`):

| Name | Duration | Easing | Purpose |
|---|---|---|---|
| `fade-in-up` | 0.7s | `cubic-bezier(0.16,1,0.3,1)` | Reveal entrance |
| `drift-slow` | 240s | linear | Infinity hero art rotation |
| `pulse-glow` | 7s | ease-in-out | Hero symbol glow pulse |
| `twinkle` | 5s | ease-in-out | Star/dust particle opacity |
| `float-y` | 6s | ease-in-out | Subtle vertical hover float |
| `scroll-dot` | 2.2s | `cubic-bezier(0.4,0,0.2,1)` | Scroll indicator bounce |

**Custom timing function:** `ease-premium` = `cubic-bezier(0.16, 1, 0.3, 1)` — used on all card transitions, navbar, buttons.

**Reduced motion:** `prefers-reduced-motion` disables all animations globally via `globals.css`.

---

## Completed Features

### Landing Page (`/`)

| Section | Component | Details |
|---|---|---|
| Navbar | `components/layout/navbar.tsx` | Fixed floating pill, scroll-aware transparency, active link indicator (gradient line), mobile hamburger, Log in / Join buttons |
| Hero | `components/sections/hero.tsx` | Badge ("The Limitless Network"), headline, subtitle, 2 CTAs (Join the Network / Explore Projects), quick overview card, scroll indicator, InfinityHeroArt on desktop right column |
| About | `components/sections/about.tsx` | "About Azenion" pill tag, headline, description paragraphs, "Why join" sidebar with bullet list, CTA |
| Features | `components/sections/features.tsx` | 4-column grid: Connect, Collaborate, Innovate, Elevate. Each with icon, title, description. Hover effects (translateY, scale, border glow) |
| Institutions | `components/sections/institutions.tsx` | Horizontal row of 5 institution names (EMSI, ENSA, UM6P, UM5, UIT), "& more coming soon" badge |
| PageBridge | `components/sections/page-bridge.tsx` | Cosmic gradient section with floating particle dots, vertical energy line, "The journey continues" text |
| Footer | `components/layout/footer.tsx` | Logo, tagline, nav links (excluding "/"), social icons, copyright |

### About Page (`/about`)

| Section | Component | Details |
|---|---|---|
| Hero | `components/sections/about/hero.tsx` | Cosmic background with radial glows, InfinityHeroArt, headline, subtitle, scroll indicator |
| Our Story | `components/sections/about/our-story.tsx` | Timeline-inspired layout with left vertical gradient line, 4 pain points as timeline nodes, narrative paragraphs |
| Our Mission | `components/sections/about/our-mission.tsx` | 3 premium glass cards (Connect, Build, Elevate) with icon glow, hover elevation, consistent `h-full` layout |
| Core Values | `components/sections/about/core-values.tsx` | 3-column grid of 6 values (Curiosity, Collaboration, Innovation, Excellence, Inclusivity, Continuous Learning) with hover title color shift |
| Who Belongs | `components/sections/about/who-belongs.tsx` | 4-column grid of 8 roles with large icons, premium card styling, closing statement |
| Ecosystem | `components/sections/about/ecosystem.tsx` | 2 rows of 3 connected cards with step numbers, gradient arrow connector, descriptions |
| Vision | `components/sections/about/vision.tsx` | Full-width cinematic with InfinityHeroArt backdrop, 3 stat cards (Ideas → Projects → Startups), closing quote |
| Closing CTA | `components/sections/about/closing-cta.tsx` | Centered headline, description, 2 CTAs (Join Azenion / Explore Projects) |

### Reusable Components & Graphics

- **Logo** — Infinity symbol SVG via Next/Image, configurable wordmark and size
- **InfinityHeroArt** — Pure SVG infinity curve with:
  - Deterministic particle field (82 star + 60 dust particles) for SSR/CSR consistency
  - 3 stacked blurred strokes for volumetric glow
  - Radial gradient core
  - Drift, pulse-glow, and twinkle animations
  - `idPrefix` prop for multi-instance safety
- **Button** — 3 variants, 3 sizes, polymorphic `asChild`
- **Badge** — Glass pill inline element
- **Reveal** — Scroll-triggered intersection observer with configurable delay
- **PageBridge** — Cosmic gradient transition element

### Responsive Behavior

- Mobile-first Tailwind breakpoints (`sm:`, `lg:`)
- Navbar: hamburger menu on `<lg`, full nav on `lg+`
- Hero: stacked on mobile, side-by-side on `lg+`
- Feature grid: 1 col on mobile → 2 on `sm` → 4 on `lg`
- Mission: 1 col mobile → 3 on `sm`
- Values: 1 col → 2 on `sm` → 3 on `lg`
- Roles: 2 cols mobile → 4 on `sm`
- Ecosystem: stacked vertical mobile → horizontal rows on `lg`
- Institutions: flex-wrap centered, adjusts to viewport
- All typography scales down on mobile via responsive text classes

---

## Design Language

### Color Palette

```
void-950     #050507    — Near-black (primary background)
void-900     #0a0b10    — Slightly lighter near-black
void-800     #0e1016    — Even lighter near-black
surface      #12141c    — Surface cards/sections
surface-hover #171a24   — Surface hover

accent       #2828FF    — Primary brand accent (rgb 40,40,255)
accent-400   #6D6DFF    — Lighter accent (hover text, glows)
accent-300   #A5A8FF    — Even lighter (used sparingly)
accent-glow  #4747FF    — Glow variant

ink-50       #F4F5F8    — Lightest text (headlines, nav)
ink-200      #C7C9D6    — Secondary text
ink-400      #8B8D9A    — Muted body text
ink-600      #5B5D6B    — Subtle/copyright text

border       rgba(244,245,248,0.08)  — Default borders
border-strong rgba(244,245,248,0.14) — Stronger borders

dust         #FFD9B3    — Warm accent (particle fields)
```

### Typography

- **Headlines:** `font-semibold`, `tracking-tight`, `leading-[1.08]`, responsive sizes (2.75rem → 3.4rem → 3.75rem+)
- **Body:** `text-[1.02rem]`, `leading-8`, `text-ink-400`
- **Small/meta:** `text-xs`, `tracking-[0.14em]`, `uppercase`, `font-medium`
- **Font stacks:** `font-display` (Proxima Nova → Inter → system) for wordmark; `font-sans` (Inter → system) for body
- **Text balance:** `text-balance` utility class used on all headlines

### Spacing

- Section padding: `py-20 sm:py-24 lg:py-28` (or similar)
- Card padding: `p-6 sm:p-7` for small, `p-8 sm:p-9` for large
- Max content widths: `max-w-[920px]` (hero text), `max-w-[960px]` (card grids), `max-w-[1320px]` (full sections)
- Container max: `2xl: 1400px` with center alignment
- Grid gaps: `gap-4 sm:gap-5 lg:gap-6` depending on section

### Glassmorphism

Used deliberately, not ubiquitously:
- Cards: `bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]` + `backdrop-blur-xl` + `shadow-card` (inner top highlight)
- Navbar: `backdrop-blur-2xl` with dynamic background opacity based on scroll
- Footer and sections use solid backgrounds, not glass (reserved for floating elements)

### Animations & Hover Effects

- **Cards:** `hover:-translate-y-1.5` (subtle lift), `hover:border-accent-400/40` (blue border), `hover:shadow-glow-sm` (blue outer glow), inner radial glow overlay fades in
- **Navbar links:** `hover:bg-white/[0.06]`, active link gets gradient bottom line
- **Buttons:** `hover:-translate-y-0.5`, `hover:shadow-glow`, `active:scale-[0.98]`
- **Scroll reveals:** `Reveal` component with `translate-y-8 opacity-0` → `translate-y-0 opacity-100`, staggered delays (60–80ms per item)
- **Duration:** `duration-300` for quick interactions, `duration-500` for card transitions, `duration-700` for navbar
- **Easing:** `ease-premium` (`cubic-bezier(0.16, 1, 0.3, 1)`) everywhere — snappy entrance, smooth settle

### Cosmic Aesthetic

- Deep near-black backgrounds (`#050507`) with subtle radial gradients simulating nebula
- Large blurred glow orbs (`bg-accent/10 blur-[120px]`)
- Floating particle dots (tiny circles with opacity)
- Infinity symbol as recurring visual motif (SVG with particle fields, glow, drift animation)
- Gradient overlays: `from-accent/X via-transparent to-transparent`
- Grain texture overlay (`noise.svg` at 2.5% opacity, `mix-blend-overlay`)
- The "PageBridge" serves as cosmic transition between sections

### Infinity Symbol

- The infinity curve is defined as an SVG path in `infinity-hero-art.tsx`
- Path: `M80 260C80 88 272 88 400 260C528 432 720 432 720 260C720 88 528 88 400 260C272 432 80 432 80 260Z`
- Same bezier curve as `public/logo.svg` (brand mark), scaled 2x
- Used in: landing page hero, about page hero, vision section

### UI Principles

- **Dark-only:** No light mode. The void is part of the brand identity.
- **Negative space:** Generous padding and margins. Nothing feels cramped.
- **Premium over dense:** Every element has room to breathe.
- **Consistent tokens:** Colors, fonts, shadows, radii (`rounded-2xl` for cards, `rounded-full` for pills/buttons) are reused systematically.
- **Subtle depth:** Inner top highlight on cards (`shadow-card`), outer glow on hover, backdrop blur for glass elements.
- **No borders on image/logo containers** unless necessary — content floats on the void.
- **Gradients are radial, not linear** — they simulate cosmic light sources.

---

## Remaining Work

### Pages to Build (in recommended order)

1. **/branches** — Institution-based branches as gateways into the ecosystem. Each branch (EMSI, ENSA, UM6P, etc.) gets a premium hub card with identity, description, member count, events, "Join Branch" CTA.

2. **/teams** — Cross-disciplinary teams formed around projects. Showcase active teams, their focus areas, members, and open recruitment.

3. **/projects** — Hands-on work showcase. Filterable grid of projects with descriptions, tech stack, team, status indicators.

4. **/showcase** — Platform for members to share work, celebrate wins. Gallery/masonry layout with featured builds.

5. **/announcements** — News and updates feed. Timeline of announcements with categories, dates, expandable content.

6. **/contact** — Contact form and information. Simple, elegant contact page with form fields, social links, maybe a map or location.

7. **/join** — Join flow / sign-up page. Call-to-action page explaining membership benefits with sign-up form.

8. **/login** — Login page. Simple authentication form consistent with the brand aesthetic.

### Additional Considerations

- Some pages need corresponding entries in `data/` files (e.g., branches data, teams data, projects data)
- Font hinting: Proxima Nova `.woff2` files are not bundled (licensed font). Documented in `public/fonts/README.md`
- OG images: Custom OG image per page would enhance shareability

---

## Current TODOs & Polish

- [x] Navbar active link detection via `usePathname()`
- [x] Mission cards equal-height fix (added `h-full flex flex-col` to cards, `h-full` to Reveal wrapper)
- [x] PageBridge cosmic transition between Home and About
- [x] About hero seamless entrance from bridge (matching radial glow)
- [ ] Proxima Nova font files need to be dropped into `public/fonts/` before production deployment
- [ ] Consider adding OG images per page

---

## Technical Notes

### Existing Reusable Components

| Component | Reusability |
|---|---|
| `Button` | Use for all CTAs. `variant`, `size`, `asChild` cover all cases. |
| `Badge` | Use for section labels, tags, status indicators. |
| `Reveal` | Use for any scroll-triggered entrance animation. Pass `className` for sizing, `delay` for stagger. |
| `Logo` | Use whenever the brand mark or wordmark is needed. |
| `InfinityHeroArt` | Can be used as decorative background on any page. Ensure unique `idPrefix` per instance. |
| `PageBridge` | Can be used between any two major sections. |

### Opportunities for Reuse

- A shared `Card` or `GlassCard` component could be extracted from the repeated card patterns (icon + title + description + hover effects). Currently each section duplicates ~15 lines of Tailwind classes.
- The premium card hover pattern (translate-y, border glow, shadow glow, radial overlay) is repeated in ~5 files. Could be extracted into a reusable `cn()` string or component.
- Section heading pattern (heading + subheading paragraph) is repeated across multiple sections.

### Code Quality Observations

- **TypeScript:** Strict mode with `noUncheckedIndexedAccess`. All props typed. No `any` usage found.
- **Server/Client split:** Well-considered. Interactive components (Navbar, Reveal) are client components with `"use client"`. Purely presentational sections are server components.
- **Data decoupling:** Content lives in `data/` files, separate from JSX. Editing copy does not require touching component logic.
- **Deterministic particle data:** `infinity-particles.ts` uses hardcoded coordinates from a seeded PRNG, preventing hydration mismatches.
- **Accessibility:** Skip-to-content link, `aria-label` on interactive elements, semantic HTML (`<main>`, `<nav>`, `<section aria-labelledby>`), `sr-only` headings where needed.
- **Animations respect reduced motion** via `prefers-reduced-motion` in `globals.css`.

### Technical Debt / Improvement Areas

- No shared card component — card patterns duplicated across 5+ files
- No ESLint plugins beyond `next/core-web-vitals`
- No tests (unit or e2e)
- No CI/CD pipeline configured
- Proxima Nova font files not included (licensing)
- No image optimization beyond Next/Image defaults
- The `h-13 w-13` utility classes used in mission cards are not in the Tailwind default scale (would need to be verified they work)

---

## Next Development Task: Branches Page

### Priority
Immediate. This is the next page to build.

### Context
The `/branches` page should present Azenion's institution-based branches as gateways into the ecosystem. The existing `data/institutions.ts` already contains 5 institutions (EMSI, ENSA, UM6P, UM5, UIT) that should serve as the branch data.

The Branches page exists in the nav bar at `/branches` (already defined in `NAV_LINKS`).

### Design Requirements

- **Continue the existing aesthetic:** Dark cosmic theme, `rgb(40,40,255)` accent, glassmorphism cards, `Reveal` animations, premium hover effects, large negative space
- **Each branch should feel like a premium hub:** Unique identity, description, member count (placeholder/static), events, "Join Branch" CTA
- **Hero section:** Cinematic branch-themed hero with InfinityHeroArt or similar cosmic backdrop
- **Branch cards:** Grid of institution cards with icons/emblems, descriptions, stats, and CTAs
- **Visual variety:** Avoid duplicating layouts from the About page. Consider:
  - Alternating card layouts (image-left, text-right)
  - Hover states that reveal more info
  - Connected visual elements (subtle lines/glows between related branches)
  - A map or geographic element if locations make sense
- **Responsive:** Full mobile/tablet/desktop support

### Code Architecture

1. Create `data/branches.ts` with branch data interface (extend `Institution` with description, memberCount, events, etc.)
2. Create page at `app/branches/page.tsx` with metadata export
3. Create section components in `components/sections/branches/`
4. Reuse existing primitives: `Button`, `Badge`, `Reveal`, `Logo`, `Navbar`, `Footer`, `PageBridge`
5. Follow the same naming conventions and file structure as the About page

### Key Considerations

- The Navbar already links to `/branches` — it will work automatically once the route exists
- Use `Reveal` with staggered delays for entrance animations
- Maintain the same `max-w-[960px]` or `max-w-[920px]` content widths
- Use the same premium card pattern (glass background, hover glow, icon treatment)
- Keep copy inspirational and aligned with the brand voice
- No need to modify existing files unless adding to shared data

---

## Claude Prompt (Copy & Paste)

```
You are continuing development of the Azenion website — a Next.js 14 project for "The Limitless Network," a global community connecting ambitious students, developers, and innovators.

## Project Context

The project uses Next.js 14 App Router with TypeScript (strict mode), Tailwind CSS 3.4, lucide-react icons, and class-variance-authority for component variants. The design is dark cosmic-themed (background #050507, accent rgb(40,40,255)), with glassmorphism, premium card hover effects, scroll-reveal animations via a Reveal component, and a custom `ease-premium` cubic-bezier timing function. Content is decoupled from JSX in `data/` files. Custom animations include drift-slow (240s rotation), pulse-glow (7s), twinkle (5s), float-y (6s), and scroll-dot. The infinity symbol is the core brand motif.

## Current State

Two pages are built: `/` (landing page with Hero, About, Features, Institutions, PageBridge, Footer sections) and `/about` (with hero, our-story, our-mission, core-values, who-belongs, ecosystem, vision, closing-cta sections). Both use the same Navbar (fixed floating pill with active link indicator via usePathname) and Footer.

Reusable components: Button (3 variants, 3 sizes, polymorphic asChild), Badge (glass pill), Reveal (IntersectionObserver scroll animation), Logo (Next/Image + wordmark), InfinityHeroArt (SVG infinity symbol with particle fields), PageBridge (cosmic gradient transition).

## Your Task

Build the /branches page. The Navbar already links to /branches. Create the route at app/branches/page.tsx and sections in components/sections/branches/.

Use data/institutions.ts as a starting point — it has 5 institutions (EMSI, ENSA, UM6P, UM5, UIT) — but create a dedicated data/branches.ts with richer data (description, memberCount, events array, etc.) for each branch.

Design requirements:
- Cinematic hero with cosmic backdrop (reuse InfinityHeroArt)
- Premium branch cards with glassmorphism, hover glows, and staggered reveal animations
- Each branch card: identity/name, description, member count (placeholder), events list, "Join Branch" CTA
- Visual variety — avoid repeating the exact card layout from About page (consider alternating layouts, connected elements, or a different grid structure)
- Full responsive support
- Maintain dark cosmic aesthetic, typography scale, spacing rhythm, and brand voice
- Reuse existing components: Navbar, Footer, Button, Badge, Reveal, InfinityHeroArt, PageBridge

Follow the existing patterns exactly: same file structure, same naming conventions, same animation system, same design tokens. Do not add comments. Do not redesign existing components. Write production-ready TypeScript.
```
