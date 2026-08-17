# Portfolio Website Plan

## Overview

Transform the current RonakOS (desktop-portfolio) into a section of a larger, polished portfolio website. The landing page features a light/white Google-aesthetic with floating cards that have organic bubble-like borders and a scroll-driven depth system. A particle-based snake follows the cursor in the background, creating an interactive, satisfying experience. The existing OS lives at ronakchavva.com and is linked from the landing page.

- **Landing page**: test.ronakchavva.com (eventually ronakchavva.com)
- **OS**: ronakchavva.com (eventually os.ronakchavva.com)

---

## Tech Stack

| Layer              | Choice                        | Why                                                      |
| ------------------ | ----------------------------- | -------------------------------------------------------- |
| Framework          | Vite + React (existing)       | Already works, fast builds, no reason to switch          |
| 3D / Particles     | react-three-fiber + drei      | GPU particles, depth, post-processing (bloom, DOF)       |
| UI Animations      | Framer Motion                 | Card transitions, section reveals, hover states          |
| Styling            | Tailwind CSS (existing)       | Already set up, fast for UI cards                        |
| Routing            | react-router-dom              | `/` = landing, OS at external ronakchavva.com            |
| SVG Effects        | Raw SVG filters               | Organic bubble card borders via feTurbulence + displacement |
| Glass Effect       | @ybouane/liquidglass          | WebGL liquid glass refraction on hero name text          |

---

## Section 1: Project Structure & Routing

### New directory structure (inside this repo)

```
src/
  main.tsx                    (entry, router)
  App.tsx                     (router wrapper)
  pages/
    LandingPage.tsx           (the new landing page)
  components/
    landing/
      HeroSection.tsx         (name, tagline, CTA)
      ProjectCard.tsx         (floating bubble card for projects)
      SkillCard.tsx           (floating bubble card for skills)
      AboutCard.tsx           (floating bubble card for about)
      ContactCard.tsx         (floating bubble card for contact)
      BubbleCard.tsx          (shared card wrapper with SVG displacement)
      DepthContainer.tsx      (scroll-tracking container for z-depth)
      ParticleSnake.tsx       (R3F canvas + particle system)
      SnakeFood.tsx           (food spawner near cursor)
    desktop/                  (existing OS components, unchanged)
    apps/                     (existing OS components, unchanged)
    window/                   (existing OS components, unchanged)
  stores/                     (existing stores, unchanged)
  lib/                        (existing supabase.ts, unchanged)
  styles/
    globals.css               (existing, extended for landing page)
```

### Routing

- `/` renders `LandingPage.tsx`
- The OS is NOT a route on this app. The landing page links to `ronakchavva.com` (external).
- If someone navigates to test.ronakchavva.com/os or anything else, fallback to landing page.

### Notes

- The existing OS code under `components/desktop/`, `components/apps/`, `components/window/` stays exactly where it is.
- The OS entry point (`main.tsx` currently) will need to be restructured so the landing page and OS can coexist under one router, but since the OS is at a separate domain for now, we just build the landing page independently.
- **Decision**: For Phase 1, we build the landing page as the new root of this repo. The OS code stays but isn't routed to. When we eventually move the OS to os.ronakchavva.com, we'll split the repos or use a monorepo setup.

---

## Section 2: Landing Page Layout (Phase 1)

### Hero Section

- Full viewport height
- Centered content with generous whitespace
- Name: "Ronak Chavva" in large clean sans-serif (Inter or Google Sans Text)
- Tagline: "makin things that look like they work"
- Subtle animated entrance (fade + slide up via Framer Motion)
- Two CTAs:
  - "Explore OS" button -> opens ronakchavva.com in new tab
  - GitHub icon link -> github.com/Eskan0r

### Floating Cards Section

Below the hero, cards float in whitespace. Each card is a `BubbleCard`:

- **Skills container**: Interactive physics (see Section 3)
- **Projects card(s)**:
  - BSG (Binary Search Gang) - links to https://github.com/acmutd/bsg
  - RonakOS - links to ronakchavva.com
- **Contact card**: GitHub, LinkedIn, Email

### Card Design (BubbleCard - Glass)

- Semi-transparent white background (`rgba(255,255,255,0.65)`)
- `backdrop-filter: blur(24px)` for Apple-style frosted glass
- Subtle white border (`rgba(255,255,255,0.6)`) for glass edge highlight
- Inner shadow (`inset 0 1px 0 rgba(255,255,255,0.5)`) for depth
- SVG `<filter>` with `feTurbulence` + `feDisplacementMap` for organic wobbly borders
- Rounded corners (24px)
- Clean typography inside (JetBrains Mono for labels, Inter for body)

### Ambient Background

- Full-page `<canvas>` with animated bubbles, lives inside the liquidglass root so bubbles refract through the hero name as they pass
- Canvas marked `data-dynamic` so liquidglass re-captures every frame
- Bubbles spawn from bottom-left corner, travel to top-right corner
- Trajectory calculated from actual screen dimensions: angle = atan2(-height, width) with tight 0.3 radian spread
- Inverted gradient: transparent center fading to solid edge (real soap bubble look)
- Large bubbles: 114px radius (3x previous), uniform size
- Up to 15 bubbles on screen, spawning every 400ms
- Base speed 3.5, slight random variation (85-115%)
- Specular highlight + white glint for glossy finish
- `pointer-events: none` on the canvas so UI above handles its own events

### Liquid Glass Hero Text

- Hero name uses `@ybouane/liquidglass` library for WebGL refraction
- The hero-name div is a **direct child** of the liquidglass root (library requirement - nested elements are silently rejected)
- Animated bubbles canvas is also a direct child with `data-dynamic` so the shader captures and refracts bubbles passing behind the name
- Config: high refraction (0.85), slight blur, edge highlights, specular, chromatic aberration
- Text is dark on top of the glass panel
- Tagline and CTAs are in a separate fixed-position `.hero-center` div (outside the liquidglass root)
- **Gotcha**: Framer Motion's inline `transform` overrides CSS `transform: translateX(-50%)` for centering - use `left: 0; right: 0` with flex centering instead
- **Gotcha**: `.liquid-glass-root` must NOT have `overflow: hidden` - clips the injected glass canvas

### Depth System

- Cards are positioned in a scattered layout across the viewport
- As user scrolls, cards near viewport center are at full scale (1.0) and full opacity
- Cards scrolled past (above) or not yet reached (below) scale down (0.85-0.9) and gain slight blur + reduced opacity
- Achieved via `IntersectionObserver` + CSS transforms, or Framer Motion's `useScroll` + `useTransform`
- Creates a parallax/depth effect where the "focused" card feels close and others recede

### Decisions Made

- **Hero**: Google homepage simplicity. Name large but clean, tagline below, minimal CTAs. Inter font. Lots of whitespace.
- **Card layout**: Scattered organic positioning. Cards float in whitespace but do NOT overlap (except stylistic transitions). Each card has its own breathing room.
- **Skills**: No static list. Interactive physics container (see Section 3).
- **About section**: Removed. Not needed.

---

## Section 3: Interactive Skills Container

Instead of a static skills card, the skills section is a **bounded physics container** where skill labels float around as rigid bodies.

### Concept

- A rectangular container (maybe 600x400px, centered on the page)
- Inside, skill chips/tags (e.g., "TypeScript", "React", "PostgreSQL") are physics bodies bouncing slowly off walls and each other
- Each chip has slight random velocity and rotation, creating a living, breathing cloud
- **Grab interaction**: When user clicks and holds a skill chip:
  - The chip "straightens out" (rotation snaps to 0, becomes readable)
  - It becomes kinematic (follows the mouse)
  - Moving it through the cloud pushes other chips out of the way (real collision)
  - On release, the chip rejoins the floating simulation with a small velocity
- Subtle border/container visible so the user understands it's a bounded space

### Tech: matter.js

- Purpose-built 2D rigid body physics engine (~30KB gzipped)
- Handles collision, boundaries, mouse constraint (drag), body types (dynamic vs kinematic)
- Perfect fit for this specific feature
- Renders via a `<canvas>` element managed by matter.js (not R3F - separate concern)
- Skill chips rendered as HTML overlays positioned via matter.js body positions (keeps text crisp)

### Skills to include (curated)

Organized by category, shown as floating chips:

**Languages**: TypeScript, JavaScript, Python, Go, C, C++, Java, SQL, Bash, Terraform
**Frontend**: React, Angular, Next.js, Tailwind CSS, Vite
**Backend**: Node.js, Express, FastAPI, PostgreSQL, Redis, Kafka, WebSockets, MongoDB
**Infra**: Docker, Linux, AWS (ROSA, S3, Lambda, API Gateway, Route53), Kubernetes, Git
**Security**: Cisco, Wireshark, Splunk

When a chip is grabbed and straightened, it could show the category as a subtle sub-label.

---

## Section 4: Project Cards

Two project cards floating in the layout:

### BSG (Binary Search Gang)

- Title: "Binary Search Gang"
- Subtitle: "Real-time collaborative LeetCode platform"
- Tags: Node.js, PostgreSQL, Redis, Kafka, WebSockets
- Brief description (2-3 lines max)
- CTA link -> https://github.com/acmutd/bsg (opens new tab)
- Small visual: could be a minimal icon or abstract shape

### RonakOS

- Title: "RonakOS"
- Subtitle: "Desktop-grade portfolio experience"
- Tags: React, TypeScript, Zustand, Supabase, Canvas
- Brief description (2-3 lines max)
- CTA link -> ronakchavva.com (opens new tab)
- Small visual: terminal icon or window icon (reuse from existing Desktop.tsx SVGs)

---

## Section 5: Particle Snake (Background)

### Concept

A particle-based snake lives in a full-page R3F Canvas behind all UI content. It creates ambient life and interactivity without blocking interaction with the cards above it.

### Snake Behavior

- **Body**: ~1500-2000 particles distributed along a smooth bezier/spline path
- **Head**: follows cursor with slight lag (easing factor ~0.08)
- **Body trail**: each point follows the one ahead of it with increasing lag, creating a natural serpentine motion
- **Particles**: small instanced circles/dots, green (#00ff88) with varying opacity and size
  - Head particles: largest, brightest
  - Tail particles: smaller, more transparent
  - Each particle has subtle random offset from the spine for organic width variation
- **Glow**: post-processing bloom pass gives the snake a soft green glow

### Food System

- Food dots spawn along the cursor's movement path (not randomly on screen)
- As the cursor moves, small food particles appear in its wake
- The snake head naturally steers toward the nearest food dot
- When the snake reaches food:
  - Food particle bursts into a small explosion of particles
  - A nearby card gets a brief glow/pulse effect (connecting the snake to the content)
  - New food spawns as cursor continues moving
- This creates a loop: move cursor -> food appears -> snake follows -> satisfying eat animation

### Cursor Interaction

- The cursor is represented as a force field / repulsion sphere
- When the cursor approaches the snake's particles, they scatter outward (water push effect)
- Particles smoothly return to their spine position after the cursor passes
- This creates the "water simulation" feel where the cursor displaces the particle field
- Implementation: per-frame distance check from cursor to each particle, apply outward force if within radius

### R3F Setup

- `<Canvas>` fixed position, full viewport, z-index: 0 (behind all UI)
- `pointer-events: none` on the canvas (UI above handles its own events)
- Custom cursor tracking via `onPointerMove` on the window (captured even with pointer-events: none)
- InstancedMesh for all particles (single draw call for ~2000 particles = very performant)
- Post-processing: BloomPass for glow effect (from `@react-three/postprocessing`)
- Camera: orthographic, covering the full viewport in screen-space coordinates

### Performance

- Target: 60fps on modern hardware
- Fallback: if frame rate drops below 45fps for 3 consecutive frames, reduce particle count by half
- Mobile: disable particle snake entirely, show a subtle CSS animation instead
- The snake is purely visual - no gameplay, no score, just ambient life

---

## Section 6: Contact Card

Simple card with three links:
- GitHub: github.com/Eskan0r
- LinkedIn: linkedin.com/in/ronakchavva-48b318262
- Email: ronakch8@gmail.com

Each link has a subtle icon (GitHub, LinkedIn, envelope SVGs) and hover effect.

---

## Section 7: Custom Cursor

- Hide the default system cursor when over the landing page
- Render a small custom cursor: a dot (4px) with a trailing ring (20px, follows with lag)
- The ring subtly scales up when hovering interactive elements (buttons, links, skill chips)
- Green accent color (#00ff88) to match the snake and overall theme
- On mobile/touch devices: no custom cursor, default system cursor

---

## Section 8: Polish & Production

### Loading Experience

- Brief loading screen while R3F initializes
- Show the name + tagline fading in, then the Canvas fades in behind

### Responsive Design

- **Desktop (>1024px)**: Full experience - particle snake, physics skills, scattered cards, custom cursor
- **Tablet (768-1024px)**: Particle snake disabled, skills physics still works, cards in a more structured 2-column layout
- **Mobile (<768px)**: No snake, no physics, no custom cursor. Clean stacked cards with Framer Motion scroll animations. Still looks polished.

### SEO & Meta

- Title: "Ronak Chavva - Software Engineer"
- Open Graph image (create a simple one with name + tagline)
- Meta description
- Favicon (green accent)

### Performance Targets

- Lighthouse Performance: 90+
- First Contentful Paint: < 1.5s
- Total bundle (gzipped): < 150KB (R3F ~70KB, matter.js ~30KB, rest ~30KB)

---

## Implementation Phases

### Phase 1: Foundation
- Set up react-router-dom
- Build LandingPage with Hero section (Google simplicity)
- Basic BubbleCard component with SVG displacement filter
- Deploy to test.ronakchavva.com via Vercel
- **No snake, no physics yet**

### Phase 2: Cards + Depth
- Floating card layout (scattered, no overlap)
- Scroll-driven depth system (scale, blur, opacity)
- Project cards (BSG + RonakOS) with links
- Contact card
- Framer Motion entrance animations
- **Still no snake**

### Phase 3: Interactive Skills
- Add matter.js physics container
- Floating skill chips with collision
- Grab/drag/jostle interaction
- Category labels on grab

### Phase 4: Particle Snake
- Set up R3F Canvas
- Implement snake spine (bezier chain following cursor)
- InstancedMesh particle rendering
- Bloom post-processing for glow
- Food system (spawns along cursor path)
- Cursor repulsion (water push effect)
- Eat animations

### Phase 5: Custom Cursor + Polish
- Custom cursor with trailing ring
- Loading screen
- Responsive breakpoints
- Mobile fallbacks
- SEO, meta, favicon
- Performance audit and optimization

---

## Deployment

- Vercel with two domains:
  - test.ronakchavva.com -> this landing page (Phase 1-5)
  - ronakchavva.com -> existing OS (unchanged)
- Eventually swap: ronakchavva.com -> landing, os.ronakchavva.com -> OS
