# Portfolio Website Plan

## Overview

Light-mode landing page (`ronakchavva.com`) + desktop-grade OS (`os.ronakchavva.com`) from one repo, split at runtime by subdomain. The landing is a **toybox**: a liquid-glass hero over a WebGL lava-lamp background, an infinite project ticker ("The Wire"), and a footer with a door. The OS is linked from the landing and lives on its subdomain.

> Status (Oct 2026): landing hero, ticker, footer, refracting cursor set, and vendored water-edge glass are BUILT. Dropped/deferred: scroll depth system, skills physics container, particle snake, dark mode, SEO extras (see What's Next).

---

## Tech Stack

| Layer              | Choice                        | Why                                                      |
| ------------------ | ----------------------------- | -------------------------------------------------------- |
| Framework          | Vite + React + TypeScript (existing) | Already works, fast builds |
| Shaders / Glass    | Raw WebGL2 (SDF lava-lamp bg) + vendored liquidglass (own fork) | No deps for the bg; full control of the glass |
| UI Animations      | CSS keyframes + intervals (framer-motion installed, available) | Ticker loop, entrances |
| Styling            | Tailwind CSS (existing) + globals.css | Fast for UI cards |
| Routing            | react-router-dom + subdomain switch | `/` = landing, OS at os.ronakchavva.com |
| Content            | `src/data/projects.ts` | New ticker projects are data, not layout |
| Glass Effect       | `src/lib/liquidglass` (vendored MIT, water-edge SDF fork) | Editable refraction, wobble edges, mouse dent |

---

## Section 1: Project Structure & Routing

### New directory structure (inside this repo)

```
src/
  main.tsx                    (entry, router)
  App.tsx                     (subdomain switch + router)
  pages/
    LandingPage.tsx           (hero → ticker → footer)
  data/
    projects.ts               (ticker content)
  components/
    landing/
      HeroSection.tsx         (name glass panel + CTAs)
      AnimatedBubbles.tsx     (WebGL2 bubble bg + spring physics)
      CustomCursor.tsx        (refractable arrow/hand cursor set)
      ProjectTicker.tsx       ("The Wire" infinite ticker)
      BSGDemo.tsx             (live BSG mock, `active`-gated)
      RonakOSDemo.tsx         (live space sim, `active`-gated)
      BubbleCard.tsx          (legacy, unused)
      SiteFooter.tsx          (contact links + copy-email button)
    desktop/ apps/ window/    (OS, unchanged)
    OsDesktop.tsx             (OS shell)
  lib/
    liquidglass/              (vendored glass fork — WE OWN IT)
  styles/
    globals.css               (all landing CSS)
```

### Routing (BUILT)

- `/` renders `LandingPage.tsx`
- `/os` redirects to `https://os.ronakchavva.com`
- `*` redirects to `/`
- `os.*` hostname renders `OsDesktop` directly (no router)

### Notes

- The existing OS code under `components/desktop/`, `components/apps/`, `components/window/` stays exactly where it is.
- The OS entry point (`main.tsx` currently) will need to be restructured so the landing page and OS can coexist under one router, but since the OS is at a separate domain for now, we just build the landing page independently.
- **Decision**: For Phase 1, we build the landing page as the new root of this repo. The OS code stays but isn't routed to. When we eventually move the OS to os.ronakchavva.com, we'll split the repos or use a monorepo setup.

---

## Section 2: Landing Page Layout (Phase 1)

### Hero Section (BUILT — evolved past this spec)

- Full viewport height, centered column: glass name panel → CTAs below
- Name: "Ronak Chavva" in large Inter; tagline: "makin things that look like they work"
- Two CTAs (LinkedIn primary, GitHub icon) live OUTSIDE the glass panel — refracted pixels and DOM hitboxes don't align, so interactive content must not sit inside glass
- Panel centers via flexbox (absolute + translate breaks on mobile Safari)
- Scroll fades hero elements out via opacity

### Project Demos — "The Wire" ticker (BUILT, replaces floating cards)

Below the hero, projects stream right-to-left forever in a newsroom band:
- Data-driven from `src/data/projects.ts` (`bsg | ronakos | poster` kinds) — new projects are appended objects
- Seamless `-50%` loop, gap inside cards only, duration measured from content width (constant px/s)
- Pauses on hover / keyboard-focus / touch-hold; dup half `aria-hidden`; focus released on tab-return
- Each card IO-gates its demo (`active` prop) so only visible sims run
- Reduced motion → static stacked grid
- Current cards: BSG (chat cadence 3s), RonakOS (mobile-scaled sim), both linking out

### Ambient Background (BUILT — WebGL2 SDF, evolved past canvas bubbles)

- Fullscreen transparent canvas with a 5-blob lava-lamp SDF scene, rainbow crisp rim, hollow insides
- JS spring sim drives offsets: cursor repulsion (frozen-core direction), click-to-poke radial kicks, one scripted sweep ~1.2s after load
- Portrait zoom-fit + vertical clamps keep rims on screen; DPR caps; pauses offscreen; static under reduced motion

### Liquid Glass Hero (BUILT — vendored fork with water edges)

- `src/lib/liquidglass` (ex-MIT package, now first-party): name panel uses water-edge SDF (`glassSDF` — angular wobble + pointer dent, all taps routed through it)
- Tunables: `flowAmp/flowSpeed/flowSeed/mouseAmp` via `data-config` or defaults
- Canvas stays `data-dynamic` direct child of the glass root (`preserveDrawingBuffer` required for snapshots)
- Gotchas honored: no `loseContext()` under StrictMode, flex centering, CTAs outside glass, cursor canvases z-managed (hero z1 refracts, page canvas portalled to body)

### Decisions Made

- **Hero**: Google homepage simplicity. Name large but clean, tagline below, minimal CTAs. Inter font. Lots of whitespace.
- **Card layout**: Single infinite ticker band ("The Wire"), not scattered cards.
- **Skills**: No static list (for now).
- **About section**: Removed. Not needed.

---

## Section 3: Project Content (ticker data)

The floating-cards spec was **superseded** by "The Wire" ticker (Section 2). Projects are now pure data in `src/data/projects.ts`; appending one object adds a card with no layout surgery. Each entry has `id`, `index`, `title`, `desc`, `tags`, `href`, `accent`, and a `demo` kind (`bsg | ronakos | poster`).

Current entries:

### BSG (Binary Search Gang)

- Title: "Binary Search Gang"
- Desc: "Chrome extension for collaborative LeetCode"
- Tags: Node.js, PostgreSQL, Redis, Kafka, WebSockets
- Link -> https://github.com/acmutd/bsg
- Demo: `bsg` (live LeetCode + party-chat sim)

### RonakOS

- Title: "RonakOS"
- Desc: "Desktop portfolio experience"
- Tags: React, TypeScript, Zustand, Supabase, Canvas
- Link -> https://os.ronakchavva.com
- Demo: `ronakos` (live space / black-hole canvas sim)

---

## Section 4: Contact / Footer (BUILT as SiteFooter)

Punchline ("you reached the end <3") + GitHub / LinkedIn / RonakOS links and an **Email** button that copies `ronakch8@gmail.com` to the clipboard (shows "copied!"). No Resume link lives here — the resume is downloadable only via the OS terminal easter egg (`curl -O resume.pdf`).

---

## Section 5: Custom Cursor (BUILT — refracting replica set)

- OS cursor can't be captured by any website, so a pixel-faithful replica is drawn as DOM content: hand-drawn arrow + mocu-xcursor CC0 hand for links
- Dual canvases, one loop: hero canvas (z1, `data-dynamic`, refracts through the name glass) + page canvas (z50, portalled to body to escape the hero stacking context)
- 1:1 tracking, `.has-custom-cursor` hides the OS cursor; fine-pointer + no-reduced-motion only; touch untouched

---

## Section 6: Polish & Production

### Responsive Design (BUILT)

- **Desktop (>1024px)**: full experience
- **Tablet (768-1024px)**: condensed demos (BSG shows chat only), taller ticker cards
- **Mobile (<768px)**: stacked ticker under reduced motion, scaled sims, DPR caps, `dvh` units, icon-only BSG header, portrait shader zoom-fit
- Reduced-motion fallbacks throughout (static shader frame, static ticker grid, OS cursor)

---

## Implementation Phases (status Sep 2026)

### Phase 1: Foundation — DONE (router, landing shell, hero, deploys)
### Phase 2: Cards + Depth — SUPERSEDED (ticker replaced cards; depth dropped)
### Phase 3: Interactive Skills — ATTEMPTED + REMOVED
### Phase 4: Particle Snake — DEFERRED (spring sim covers ambient life)
### Phase 5: Custom Cursor + Polish — DONE (refracting set, mobile, footer, SEO basics pending)

---

## What's Next (backlog)

- **SEO / meta extras** — Open Graph / social cards, canonical URLs (Phase 5 leftover). Base description and font preconnects are already in `index.html`.
- **Dark mode** — deferred; the landing is intentionally light-only for now.
- **Particle snake** — deferred; the AnimatedBubbles spring sim already supplies ambient life.
- **Scroll-depth system** — dropped (superseded by hero scroll-fade + ticker).
- **Skills physics container** — attempted then removed; there is no static skills list.

---

## Deployment (CURRENT)

- Vercel, split by hostname at runtime in `App.tsx`:
  - ronakchavva.com -> landing page
  - os.ronakchavva.com -> RonakOS desktop
  - `/os` redirects to the OS subdomain; unknown paths fall back to `/`
