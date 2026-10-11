# Homepage Redesign — Research & Findings

> **Goal:** make the `ronakchavva.com` landing page feel like the award-winning sites below —
> cinematic motion, intentional spacing, scroll storytelling, and a memorable hero.
>
> **Status:** research complete. No production code changed yet. This doc is the reference for the build.
> **Last updated:** October 9, 2026

---

## 0. Method

- Four reference sites were analyzed by independent research passes (parallel subagents using web
  search + live-site fetches + third-party case studies).
- Load-bearing tech claims were then cross-checked against primary sources (see [§8 References](#8-references)).
- Findings are synthesized across all four, then mapped to the **current** `the/` codebase with a
  prioritized build plan.

| Reference | Type | One-line identity |
| --- | --- | --- |
| [noomoagency.com](https://noomoagency.com/) | Agency | Pale, glassy, WebGL-first 3D storytelling; Nuxt 3 + Three.js + GSAP |
| [activetheory.net](https://activetheory.net/) | Studio | The whole site is a real-time 3D engine (custom "Hydra"); multiplayer particles |
| [zentry.com](https://zentry.com/) | Gaming/token | Dark cinematic video scrollytelling, clip-path reveals; GSAP + Lenis (CSS-3D, no WebGL) |
| [dogstudio.co](https://dogstudio.co/) | Studio | Kinetic giant headline over a scroll-morphing 3D mascot; Three.js + TweenMax |

---

## 1. Executive summary — what actually makes them good

Across all four, "quality" is **not** a single trick. It is five systems working together:

1. **A scroll timeline is the spine.** Motion is *scrubbed by scroll position*, not triggered by fades.
   Sections **pin** while a story plays (Zentry pins one section for 4× viewport height). This is the
   single most defining trait and the biggest gap in the current site.
2. **Smooth, lerped scroll.** A virtual scroll (Lenis / GSAP ScrollSmoother / custom lerp) gives that
   "never-catches-up" weighted feel. Native scroll feels cheap next to these.
3. **One persistent 3D layer behind the DOM.** A single full-viewport canvas lives *behind* scrollable
   HTML; scroll and pointer drive camera/material/particles. It is ambient, never a per-section embed.
4. **Typography does the talking.** Huge display type + deliberate text motion: masked line-up reveals,
   letter-scramble on hover, word-by-word stagger, `rotateX/Y` hinges. Type *is* the ornament.
5. **Spacing is a system, not padding.** Fluid units (`clamp`, `vw`, `svh`), a consistent vertical
   rhythm, and mobile behavior designed first-class — which is exactly the "looks great at any size,
   zero issues" impression.

Everything else (custom cursor, loaders, sound toggles, magnetic buttons) is polish layered on those five.

---

## 2. Cross-site pattern synthesis

### 2.1 Motion & scroll
- **Scrub > trigger.** Tween progress is bound to scroll (`scrub`), so reversing the scroll reverses
  the animation. Fades are a fallback, not the main event.
- **Pinning / scrollytelling.** A section sticks and a multi-stage sequence plays across ~3–4 viewport
  heights (Zentry: intro letters flicker in random order → clip-path iris expands an image to
  fullscreen → a 3× zoom hold → `rotateY(-75deg)` headline swings flat).
- **Lerp smoothing** (~0.08–0.1) with frame-rate-normalized decay so 60/120/240 Hz feel identical.
- **Text reveals:** `overflow:hidden` + `yPercent:100→0` masked line-up; word/letter stagger
  (`stagger: 0.02`); random-order opacity flicker; `SplitText`-style char splitting.
- **Letter scramble / jumble:** hover effects that randomize glyphs then resolve to the real word
  (explicitly requested by us; nobody's referring site does it *quite* as literally, but Noomo/Dogstudio
  do letter-spacing "spread" reveals and Dogsutdio's headline is a per-letter spacing expand/collapse).
- **Hover micro-physics:** nav pill reacts to scroll velocity (Active Theory), previews scale
  `50→100%`, cards tilt toward the pointer, letters spread.
- **Loaders & transitions:** CSS `clip-path` wipe loaders; AJAX page transitions (Dogstudio
  **Highway.js**) so routes never hard-reload; overlay menus as clip-path/WebGL transitions.
- **Easing vocabulary:** `power2/3.inOut` for UI, custom beziers like `cubic-bezier(.17,.4,.02,.99)`
  for cinematic moves, `ease:"none"` for scrubbed sequences. Consistent, named easings.

### 2.2 3D / WebGL
- One fixed canvas behind DOM; UI composited on top (often with `mix-blend-mode`).
- Scroll drives **camera keyframes**, not DOM transforms; pointer adds parallax.
- Hero "object" (Noomo glass, Dogstudio dog, AT logo ring) whose **material/appearance morphs per
  section** to signal adaptability.
- Performance is a first-class concern: Draco/KTX2 compression, baked Blender animations, no
  post-processing on the main page, disabling invisible materials, DPR caps, lazy media, poster
  fallbacks.
- **You don't need WebGL to look premium:** Zentry's canonical build is pure CSS 3D
  (`perspective` + `translate3d` + `rotateX/Y`) and still won awards. WebGL is optional garnish.

### 2.3 Typography
- 1 display face + 1 body/UI face. Wide range of sizes via fluid units.
- Tight display leading, large scale, uppercase for impact; uppercase + wide letter-spacing for labels.
- Animated treatment is the brand: spread/scramble/mask/hinge.

### 2.4 Layout & spacing (the "no issues at any size" part)
- Fluid sizing everywhere: `clamp()`, `vw`, `svh`/`dvh` — no fixed pixel widths for key layout.
- Consistent vertical rhythm: section paddings derived from a base unit / spacing scale.
- Full-bleed visuals with soft "rounded-corner" masks stitched between sections (Zentry `RoundedCorners`).
- Desktop-first choreography, but breakpoints recompute pin lengths / staggers from `window.innerHeight`.
- Touch targets ≥ 48px; native scroll preserved on mobile; heavy 3D downgraded or replaced by posters.

### 2.5 Interaction polish
- Custom cursor (+ magnetic buttons), scroll-velocity-reactive nav, sound toggle (muted by default),
  page loader, scroll progress, hover "smile"/easter eggs, witty microcopy.

---

## 3. Per-site teardowns (condensed)

### 3.1 Noomo Agency
- **Vibe:** pale `#dee7f1`/`#c9d2e7` glass, plum `#231b35` / near-black `#181520` type; feels like water.
- **Stack (from their own case study):** Nuxt 3, **Three.js**, **GSAP** (+ ScrollSmoother/ScrollTrigger),
  Blender-baked animation, Blender camera on two empties; **deliberately avoids React Three Fiber**.
- **Motion:** `clip-path` polygon preloader + stepped sprite logo; header hide-on-scroll with blur; nav
  hover underline; logo cross-fade; bottom-to-top scroll inversion on home.
- **3D:** one `#main-scene`; glass with refraction; off-camera props just for reflections; no
  post-processing; mobile lowers glass quality/physics. Labs = physics-shattering glass (Cannon.js).
- **Takeaways:** bake complex animation, keep one scene, gate quality by device, group GSAP tweens
  (they fixed a GPU memory leak from un-disposed glass textures + per-animation GSAP objects).

### 3.2 Active Theory (V6)
- **Vibe:** void-black, neon/biological, "alien" monospace, tab-as-game-engine.
- **Stack:** custom WebGL engine **Hydra** (state-based functional JS), Draco meshes, GPGPU particles,
  AI chat navigation, **multiplayer** visitor cursors. (Not R3F/GSAP/Three.)
- **Layout:** no page grid — fixed canvas; scroll captured by a fixed overlay, read each rAF; DOM never
  moves. "Whitespace" = the black void.
- **Motion:** lerp `~0.08`, frame-rate-normalized; FBO crossfaded scene swaps; masked text fades;
  nav pill reacts to scroll velocity; chat input expands.
- **Perf:** LCP ~1.3s desktop via Draco + lazy video; static poster fallback at lowest tier.

### 3.2b Zentry (the clone-friendly one)
- **Vibe:** black `#010101`, full-bleed game trailers, giant type, geometric reveals.
- **Stack:** React + Vite + Tailwind + **GSAP + ScrollTrigger** (+ optional **Lenis**); CSS 3D, **no WebGL**.
  Community clone stack (JavaScript Mastery tutorial) is the most directly copyable of the four.
- **Motion kit:** `AnimatedTitle` (word split + stagger), random-order letter flicker, clip-path iris
  expand + image scale, 4×-viewport pin + scrub, `rotateY` hinge, modular video hover/crossfade,
  bento pointer-tilt, rounded-corner section masks.
- **Cleanup note:** under React StrictMode, GSAP pins/Lenis double-mount — must use `gsap.context()` +
  `ctx.revert()` and a single Lenis instance.

### 3.3 Dogstudio
- **Vibe:** dark `#131419`, warm `#f0f0d8`; witty, emotional, playful.
- **Stack:** Three.js + TweenMax, own **Highway.js** AJAX transition manager, SCSS.
- **Signature:** oversized "We Make Good Shit" headline with **letter-spacing spread** reveal over a 3D
  dog that morphs material per section (matcap swaps / `onBeforeCompile`); footer city cycler; sound
  toggle; overlay menu; capability-based 3D downgrade.

### 3.4 Common denominators (build these)
1. Lenis/SmoothScroll + GSAP ScrollTrigger (single scroll authority).
2. A persistent background canvas that reacts to scroll + pointer.
3. Split-text / masked / scramble text reveals.
4. Pinned, scrubbed story beats with clip-path reveals.
5. Fluid spacing + vertical rhythm + mobile-first choreography.
6. Loader + custom cursor + magnetic buttons + sound toggle.

---

## 4. Current `the/` homepage audit

**What exists today** (`src/pages/LandingPage.tsx` → `HeroSection` → `ProjectTicker` → `SiteFooter`):

| Area | Current implementation |
| --- | --- |
| Hero | Centered liquid-glass panel (`lib/liquidglass`), name + tagline, LinkedIn/GitHub CTAs, scroll fade via opacity |
| Background | `AnimatedBubbles.tsx`: WebGL2 SDF lava-lamp, cursor repulsion, click poke, one scripted sweep |
| Cursor | `CustomCursor.tsx`: pixel-replica arrow/hand that the glass can refract |
| Work | `ProjectTicker.tsx`: infinite right→left marquee of BSG + RonakOS live demos ("The Wire") |
| Footer | Punchline + GitHub/LinkedIn/RonakOS links + email copy button |
| Scroll | **Native** scroll; no smooth-scroll library; hero opacity fade only |
| Stack | React 18.3, Vite 5, Tailwind 3, **framer-motion 13 installed but essentially unused**; no Three.js/GSAP/Lenis |
| Spacing | Ad-hoc px paddings (hero `100dvh`, ticker `72/110px`, footer `56/48px`); 3 breakpoints (1024/768/520) |
| Accessibility | Reduced-motion fallbacks for bubbles/cursor/ticker (good); custom cursor gated on fine pointer |
| Legacy | `BubbleCard.tsx` unused |

**Strengths worth keeping:** the liquid-glass hero is genuinely distinctive, the refracting cursor is a
real "wow", the bubble sim adds ambient life, and reduced-motion handling is already thought through.

---

## 5. Gap analysis

| # | Gap vs. references | Impact |
| --- | --- | --- |
| 1 | **No scroll storytelling** — no pins, no scrubbed sequences, no reveals | Highest — this is *the* award-site trait |
| 2 | **No smooth/lerped scroll** | High — motion feel is the foundation |
| 3 | **No text motion** — static name/tagline/headings | High — cheap, huge payoff |
| 4 | **Only 3 sections** — no intro/manifesto/capabilities/contact beats | High — feels thin, no rhythm |
| 5 | **3D is ambient only** — bubbles don't react to scroll, no hero object | Medium-High |
| 6 | **No loader / page transition** | Medium — first impression |
| 7 | **Perimeter interactions missing** — magnetic buttons, card pointer-tilt, cursor blend | Medium |
| 8 | **Spacing not systematized** — px paddings, `white-space: nowrap` on the name risks mobile overflow | Medium |
| 9 | **No motion/easing tokens** — transitions are one-off |
| 10 | No scroll progress / sound toggle / easter eggs | Low-Medium |

---

## 6. Recommended build plan (mapped to the codebase)

> Order is chosen so each phase is independently shippable and visibly better. P0 delivers the
> "award-site feel" with the least risk.

### P0 — Motion foundation (no WebGL required)
1. **Add `gsap` + `ScrollTrigger` + `lenis`.** One Lenis instance drives scroll; wire
   `lenis.on('scroll', ScrollTrigger.update)` and `gsap.ticker.add(t => lenis.raf(t*1000))`.
   Wrap all GSAP in `gsap.context()` and `ctx.revert()` on cleanup (StrictMode double-mount safety).
2. **Text reveal system.** Add a `<SplitText>`/`<Reveal>` util: split headings into line/word spans,
   `overflow:hidden` + `yPercent:100→0` with stagger on enter. Apply to hero name + tagline.
3. **Letter scramble on hover.** A small `useScramble` hook (unscramble over ~600ms) for nav/labels/name
   hover — cheap, matches the "letters jumble then resolve" ask.
4. **Scroll-reveal sections** (opacity + translate + slight blur) via a reusable `data-reveal` directive.
5. **Add content beats** so there is something to scroll: a one-line **manifesto/intro**, the existing
   **selected work** (promote the ticker into a proper scroll section), and a **contact CTA** band.
6. **Spacing system.** Define spacing tokens (`--space-*`) and fluid section padding with `clamp()`;
   set a consistent vertical rhythm; remove `white-space: nowrap` and rely on `clamp` + wrapping.
7. **Hero loader.** Short clip-path wipe / counter on first load, gated so it never blocks interaction.

### P1 — Dimensional hero + interaction polish
8. **Hero 3D layer.** Either (a) upgrade the bubble scene to react to scroll (camera/`u_off` driven by
   scroll progress), or (b) add a small `@react-three/fiber` + `drei` object (glass/refraction) behind
   the DOM with scroll-driven rotation and material. Keep it one canvas, DPR-capped, paused offscreen.
9. **Magnetic buttons + card pointer-tilt** on CTAs and project cards (CSS `translate3d` via pointer).
10. **Ticker → scroll section**: per-card clip-path/parallax reveal, hover preview, keep the marquee as
    an accent rather than the only work surface. **Cursor blend** (`mix-blend-mode`) option.
11. **Scroll progress indicator** + **sound toggle** (muted default).

### P2 — Full scrollytelling
12. **Pinned scrubbed beat** (Zentry-style): one section pinned ~3–4× viewport with clip-path iris +
    image scale + a `rotateY` hinge headline. This is the "wow" centerpiece.
13. **WebGL page transition** layer if/when the site grows past one route (replaces Barba/Highway).
14. **Material/glass morph** on the hero object per section; Blender-baked or shader-based.

### Suggested concrete stack additions
- `gsap` (ScrollTrigger; **SplitText is free as of GSAP 3.13**, 2025) — the ecosystem all three clones use.
- `lenis` (lightweight smooth scroll).
- `three` + `@react-three/fiber` + `@react-three/drei` (React 18-compatible v8) **only if** choosing R3F;
  otherwise drive the existing raw-WebGL bubbles directly with the scroll progress value.
- Keep `framer-motion` if desired for micro-interactions; it does not replace ScrollTrigger's pin/scrub.

### Guardrails (must-do, from the references' own hard lessons)
- Respect `prefers-reduced-motion` (already the site's habit): disable pin/scrub, show static states.
- **Exactly one** Lenis instance; **one** ScrollTrigger set per section; clean up under StrictMode.
- DPR caps, pause offscreen, lazy-load any 3D/video; provide a poster/static hero fallback.
- Budget the hero: target first interactive paint fast; the 3D must never block content.
- Test at 320px, 375px, 768px, 1024px, 1440px, 2560px and in Safari iOS (the references all do).

---

## 7. What to do first (TL;DR)

1. `gsap` + `ScrollTrigger` + `lenis` + a text-reveal/scramble util → instantly "award-site feel" (**P0.1–4**).
2. Grow the page from 3 beats to ~5 (manifesto → work → contact) and systematize spacing (**P0.5–6**).
3. Add the loader and make the hero object scroll-reactive (**P0.7 / P1.8**).
4. Then build the one pinned scrollytelling centerpiece (**P2.12**).

---

## 8. References

**Noomo Agency**
- https://noomoagency.com/insights/noomo-agency-best-websites-design-on-awwwards (Nuxt 3, Three.js, GSAP)
- https://noomoagency.com/insights/noomo-labs-immersive-3d-website (Blender bake, no R3F, camera empties)
- https://www.awwwards.com/new-focus-new-brand-new-website.html (memory leak / GSAP grouping)
- https://www.awwwards.com/sites/noomo-agency

**Active Theory**
- https://www.commarts.com/webpicks/active-theory-2 (WebGL via JS, state-based)
- https://www.webgpu.com/showcase/active-theory-portfolio/ (Hydra framework, Draco, LCP ~1.3s)
- https://www.awwwards.com/sites/active-theory-v6

**Zentry**
- https://motionprompts.dev/component/zentry-scroll/ (pin + scrub + clip-path + Lenis, StrictMode cleanup)
- https://github.com/florixak/zentry-clone (GSAP + React + Tailwind clone)
- https://github.com/33Frok1e/zentry (Awwwards-winning clone)

**Dogstudio**
- https://www.awwwards.com/sites/dogstudio-1
- https://www.commarts.com/webpicks/dogstudio (Three.js, TweenMax, Webpack/Gulp)
- https://highway.js.org / https://github.com/Dogstudio/Highway (AJAX page transitions)

**Technique references**
- https://gsap.com/docs/v3/Plugins/ScrollTrigger/ · https://gsap.com/docs/v3/Plugins/SplitText/
- https://github.com/darkroomengineering/lenis
