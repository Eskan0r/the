// @ts-nocheck
// Koi scene adapted from Pawan-webdeveloper/Ascii-Animals-extension (MIT).
// Upstream: https://github.com/Pawan-webdeveloper/Ascii-Animals-extension
// See LICENSE in this directory. Only the koi sampler and canvas engine
// are retained; extension UI, storage, and browser APIs are not used.

export function startKoi(world: HTMLCanvasElement, bokehCanvas: HTMLCanvasElement): () => void {
const ctx = world.getContext("2d", { alpha: false });
const bctx = bokehCanvas.getContext("2d");
if (!ctx || !bctx) return () => {};
let animationId = 0;
const events = new AbortController();
const { signal } = events;
const TAU = Math.PI * 2;
const sq = (x) => x * x;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const ell = (u, v, cu, cv, ru, rv) => sq((u - cu) / ru) + sq((v - cv) / rv);
const angleDiff = (a, b) => {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};

function hash2(i, j, s) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function vnoise(x, y, s) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const sx = xf * xf * (3 - 2 * xf);
  const sy = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s);
  const b = hash2(xi + 1, yi, s);
  const c = hash2(xi, yi + 1, s);
  const d = hash2(xi + 1, yi + 1, s);
  return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

// ---------- sampler output (reused to avoid allocations) ----------

const out = { r: 0, g: 0, b: 0, a: 1, ch: null, shine: 0 };

function hit(c, a = 1, shine = 0, k = 1) {
  out.r = c[0] * k;
  out.g = c[1] * k;
  out.b = c[2] * k;
  out.a = a;
  out.ch = null;
  out.shine = shine;
  return true;
}

function glyph(chars, c, a = 1, k = 1) {
  out.r = c[0] * k;
  out.g = c[1] * k;
  out.b = c[2] * k;
  out.a = a;
  out.ch = chars;
  out.shine = 0;
  return true;
}

const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
const WHITE = [240, 244, 255];

/* =========================================================================
   Animals
   Each sampler works in sprite units: +u points the way the animal faces,
   v is lateral. `prep` runs once per frame per animal.
   ========================================================================= */


const ANIMALS = [
  {
    id: "koi",
    label: "Koi",
    swatch: [244, 196, 44],
    radius: 13,
    count: 12,
    speed: 4.4,
    turn: 1.1,
    phaseRate: 5,
    mode: "wander",
    feeds: true,
    hint: "Click the water to feed the koi",
    retarget: [2.5, 6],
    direction: 0,
    spread: 0.9,
    trail: { chars: "~-~=", color: [150, 175, 210], life: 1.8, at: [[-10, 0]] },
    variants: [
      { base: [236, 232, 226], patch: [214, 48, 36], thr: 0.5 },
      { base: [236, 232, 226], patch: [205, 45, 35], thr: 0.55, dark: [30, 30, 34] },
      { base: [244, 196, 44], patch: [250, 150, 30], thr: 0.72 },
      { base: [240, 118, 38], patch: [255, 172, 72], thr: 0.68 },
      { base: [214, 220, 228], patch: [176, 186, 202], thr: 0.6 },
    ],
    prep(e, sway) {
      e.amp = 1.3 * (0.35 + sway);
    },
    sample(u, v, e) {
      if (u < -12.6 || u > 8.4) return false;
      const P = e.pal;
      const tw = clamp((8 - u) / 20, 0, 1);
      const vv = v - e.amp * Math.sin(e.phase - u * 0.34) * tw * tw * 1.6;
      const av = Math.abs(vv);
      let hw = 0;
      if (u > 3.6) hw = 3.0 * Math.sqrt(Math.max(0, 1 - sq((u - 3.6) / 4.7)));
      else if (u > -8) hw = 0.75 + 2.25 * Math.pow((u + 8) / 11.6, 1.25);
      if (av < hw) {
        if (u > 5.5 && u < 6.9 && av > hw - 1.15 && av < hw - 0.2) return hit([22, 22, 26]);
        const n = vnoise(u * 0.3 + e.seed * 7, vv * 0.42, e.seed);
        let c = n > P.thr ? P.patch : P.base;
        if (P.dark && vnoise(u * 0.45, vv * 0.5 + 9, e.seed + 3) > 0.68) c = P.dark;
        const k = hw - av < 0.65 ? 0.78 : av < 0.5 ? 1.05 : 1;
        return hit(c, 1, 0.2, k);
      }
      const fin = mix(P.base, WHITE, 0.25);
      if (u > 0.2 && u < 3.4 && ell(u + (av - hw) * 0.45, av, 1.6, hw + 1.1, 1.3, 1.3) < 1) return hit(fin, 0.55);
      if (u <= -7.4) {
        const t = -7.4 - u;
        const fw = 0.55 + t * 0.72;
        if (av < fw && !(t > 3.7 && av < (t - 3.7) * 1.1)) return hit(fin, 0.62);
      }
      return false;
    },
  },
];
const ANIMAL_BY_ID = Object.fromEntries(ANIMALS.map((a) => [a.id, a]));

const settings = {
  density: 1, speed: 1, size: 1, depth: 0.6, sway: 0.5,
  cell: 9, trails: true, bokeh: true, reach: 220, scare: 1,
  tune: { koi: { direction: 0, spread: 0.9 } },
};
const DEFAULTS = { animal: "koi" };
const BG = [13, 16, 22];
const BG_PACKED = (255 << 24) | (BG[2] << 16) | (BG[1] << 8) | BG[0];
const GRID_LINE = "rgba(5, 6, 9, 0.94)";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const R = {
  dpr: 1,
  W: 0,
  H: 0,
  cell: 9,
  cols: 0,
  rows: 0,
  line: 1,
  lo: document.createElement("canvas"),
  loCtx: null,
  img: null,
  buf: null,
  blo: document.createElement("canvas"),
  bloCtx: null,
  bimg: null,
  bbuf: null,
  overlay: document.createElement("canvas"),
  occ: null,
  tLife: null,
  tChar: null,
  tCol: null,
  font: "",
};
R.loCtx = R.lo.getContext("2d");
R.bloCtx = R.blo.getContext("2d");

function resize() {
  R.dpr = Math.min(window.devicePixelRatio || 1, 2);
  R.W = Math.round(window.innerWidth * R.dpr);
  R.H = Math.round(window.innerHeight * R.dpr);
  R.cell = Math.max(4, Math.round(settings.cell * R.dpr));
  R.line = Math.max(1, Math.round(R.dpr));
  R.cols = Math.ceil(R.W / R.cell) + 1;
  R.rows = Math.ceil(R.H / R.cell) + 1;

  for (const c of [world, bokehCanvas]) {
    c.width = R.W;
    c.height = R.H;
  }

  R.lo.width = R.blo.width = R.cols;
  R.lo.height = R.blo.height = R.rows;
  R.img = R.loCtx.createImageData(R.cols, R.rows);
  R.buf = new Uint32Array(R.img.data.buffer);
  R.bimg = R.bloCtx.createImageData(R.cols, R.rows);
  R.bbuf = new Uint32Array(R.bimg.data.buffer);

  const n = R.cols * R.rows;
  R.occ = new Int16Array(n);
  R.tLife = new Float32Array(n);
  R.tChar = new Uint8Array(n);
  R.tCol = new Uint8Array(n * 3);

  R.font = `600 ${Math.round(R.cell * 1.02)}px "Geist Mono", ui-monospace, monospace`;
  drawOverlay();
}

function drawOverlay() {
  const o = R.overlay;
  o.width = R.W;
  o.height = R.H;
  const g = o.getContext("2d");
  g.clearRect(0, 0, R.W, R.H);
  g.fillStyle = GRID_LINE;
  for (let i = 0; i <= R.cols; i++) g.fillRect(i * R.cell, 0, R.line, R.H);
  for (let j = 0; j <= R.rows; j++) g.fillRect(0, j * R.cell, R.W, R.line);
  const rg = g.createRadialGradient(R.W / 2, R.H * 0.45, Math.min(R.W, R.H) * 0.2, R.W / 2, R.H * 0.5, Math.hypot(R.W, R.H) * 0.62);
  rg.addColorStop(0, "rgba(0,0,0,0)");
  rg.addColorStop(1, "rgba(0,0,0,0.55)");
  g.fillStyle = rg;
  g.fillRect(0, 0, R.W, R.H);
}

/* ---------- entities ---------- */

let entities = [];
let bokehs = [];
let seedCounter = 1;
let simTime = 0;
let current = DEFAULTS.animal; // the animal shown in this tab (can differ from the saved pick in random mode)
const pointer = { x: -1e9, y: -1e9, active: false };
const foods = []; // koi pellets: { x, y, vx, vy, age, life, tint }
const ripples = []; // tap feedback: { x, y, age, dur, maxR, chars, color }

function scaleFor(e) {
  const far = 1 - settings.depth * 0.62;
  return settings.size * (e.A.scale || 1) * lerp(far, 1.12, e.z) * (e.bokeh ? 1.7 : 1);
}

function makeEntity(A, opts = {}) {
  const tune = settings.tune[A.id];
  const dirRad = ((tune.direction - 90) * Math.PI) / 180;
  const e = {
    A,
    x: opts.x ?? rand(0, R.W),
    y: opts.y ?? rand(0, R.H),
    z: opts.z ?? Math.pow(Math.random(), 0.85),
    seed: (seedCounter++ * 2654435761) >>> 16,
    pal: pick(A.variants),
    phase: rand(0, TAU),
    rateMul: rand(0.85, 1.15),
    speedMul: rand(0.75, 1.25),
    baseOff: rand(-1, 1),
    heading: 0,
    target: 0,
    retargetAt: 0,
    fade: opts.fade ?? 0,
    leaving: false,
    bokeh: !!opts.bokeh,
    speedMod: 1,
    phaseMod: 1,
    lastTrail: -1,
    trailFlip: 0,
    scared: 0,
    scareX: 0,
    scareY: 0,
  };
  e.heading = e.target = dirRad + (A.mode === "flow" ? e.baseOff * Math.PI * tune.spread * 0.35 : rand(-1, 1) * Math.PI * tune.spread);
  return e;
}

function desiredCount(A) {
  const area = (window.innerWidth * window.innerHeight) / (1440 * 900);
  return Math.max(1, Math.round(A.count * settings.density * clamp(area, 0.35, 2.2)));
}

function syncPopulation(initial = false) {
  const A = ANIMAL_BY_ID[current];
  const live = entities.filter((e) => !e.leaving && e.A === A);
  const want = desiredCount(A);
  if (live.length < want) {
    for (let i = live.length; i < want; i++) entities.push(makeEntity(A, { fade: initial ? 1 : 0 }));
  } else if (live.length > want) {
    live.slice(want).forEach((e) => (e.leaving = true));
  }
  const bWant = settings.bokeh && !reducedMotion.matches ? 2 : 0;
  bokehs = bokehs.filter((b) => b.A === A || b.fade > 0);
  bokehs.forEach((b) => {
    if (b.A !== A) b.leaving = true;
  });
  const liveB = bokehs.filter((b) => !b.leaving);
  for (let i = liveB.length; i < bWant; i++) bokehs.push(makeEntity(A, { bokeh: true, z: 1, fade: initial ? 1 : 0 }));
  liveB.slice(bWant).forEach((b) => (b.leaving = true));
}

/* ---------- taps: feeding and startling ---------- */

function tapReach() {
  return settings.reach * R.dpr;
}

function addRipple(x, y, opts = {}) {
  ripples.push({ x, y, age: 0, dur: opts.dur ?? 0.9, maxR: opts.maxR ?? 6, chars: opts.chars ?? "Â·", color: opts.color ?? [200, 210, 230] });
  if (ripples.length > 24) ripples.shift();
}

function tap(x, y) {
  const A = ANIMAL_BY_ID[current];
  const pale = mix(A.swatch, WHITE, 0.55);


  if (A.feeds) {
    const n = 6 + ((Math.random() * 4) | 0);
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const r = Math.sqrt(Math.random()) * 2.6 * R.cell;
      const s = rand(0.3, 1.2) * R.cell;
      foods.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: Math.cos(a) * s, vy: Math.sin(a) * s, age: 0, life: rand(14, 18), tint: rand(0.85, 1.12) });
    }
    while (foods.length > 80) foods.shift();
    addRipple(x, y, { dur: 1.3, maxR: 7, chars: "~", color: [150, 185, 220] });
    return;
  }

  const reach = tapReach();
  for (const e of entities) {
    if (e.leaving) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d = Math.hypot(dx, dy) || 1;
    const lim = reach + A.radius * scaleFor(e) * R.cell;
    if (d > lim) continue;
    const s = 0.45 + 0.55 * (1 - d / lim);
    e.scared = Math.max(e.scared, s);
    e.scareX = dx / d;
    e.scareY = dy / d;
    if (A.onScare) A.onScare(e);
  }
  addRipple(x, y, { dur: 0.75, maxR: Math.max(4, (reach / R.cell) * 0.45), chars: A.rippleChars || "Â·", color: pale });
}

/* ---------- simulation ---------- */

function step(dt) {
  const motion = reducedMotion.matches ? 0.3 : 1;
  const sp = settings.speed * motion;
  simTime += dt * motion;
  const t = simTime;
  const all = entities.concat(bokehs);
  const reachPx = tapReach();

  // pellets drift apart a little, then sit and slowly dissolve
  for (const f of foods) {
    f.age += dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.vx *= Math.pow(0.12, dt);
    f.vy *= Math.pow(0.12, dt);
  }
  for (let i = foods.length - 1; i >= 0; i--) if (foods[i].age > foods[i].life || foods[i].eaten) foods.splice(i, 1);

  for (const r of ripples) r.age += dt;
  while (ripples.length && ripples[0].age > ripples[0].dur) ripples.shift();

  for (const e of all) {
    const A = e.A;
    const tune = settings.tune[A.id];
    const dirRad = ((tune.direction - 90) * Math.PI) / 180;

    e.fade = e.leaving ? Math.max(0, e.fade - dt / 0.6) : Math.min(1, e.fade + dt / 0.9);
    if (e.scared > 0) e.scared = Math.max(0, e.scared - dt / 1.4);
    const scare = e.scared * settings.scare;

    e.speedMod = 1;
    e.phaseMod = 1;
    A.prep(e, settings.sway, t);
    if (scare > 0) {
      e.speedMod = Math.max(e.speedMod, 0.9);
      e.phaseMod = Math.max(e.phaseMod, 1) * (1 + scare * 1.6);
    }
    e.phase += dt * A.phaseRate * e.rateMul * e.phaseMod * (0.55 + 0.45 * sp);

    // where does it want to go?
    if (A.mode === "flow") {
      e.target = dirRad + e.baseOff * Math.PI * tune.spread * 0.35 + (A.wobble ? A.wobble(e, t) * (0.4 + settings.sway * 1.2) : 0);
    } else if (t >= e.retargetAt) {
      e.target = dirRad + rand(-1, 1) * Math.PI * tune.spread;
      e.retargetAt = t + rand(A.retarget[0], A.retarget[1]);
    }

    let dx = Math.cos(e.target);
    let dy = Math.sin(e.target);
    const k = scaleFor(e);
    const reach = A.radius * k * R.cell;
    let boost = 1;
    let turnMul = 1;
    let crowd = 1.6;

    // koi: find the nearest pellet in range and go for it
    if (A.feeds && foods.length && !e.bokeh && !e.leaving) {
      const hx = e.x + Math.cos(e.heading) * 6.5 * k * R.cell;
      const hy = e.y + Math.sin(e.heading) * 6.5 * k * R.cell;
      // close koi rush in; koi further out notice more slowly and drift over
      const sense = reachPx * 2.6;
      let best = null;
      let bestD = sense;
      for (const f of foods) {
        if (f.eaten) continue;
        const d = Math.hypot(f.x - hx, f.y - hy);
        if (d < bestD) {
          bestD = d;
          best = f;
        }
      }
      if (best) {
        const close = clamp(1 - bestD / reachPx, 0, 1);
        const far = bestD > reachPx;
        const fx = (best.x - hx) / (bestD || 1);
        const fy = (best.y - hy) / (bestD || 1);
        const pull = far ? 2.2 : 3 + 5 * close;
        dx += fx * pull;
        dy += fy * pull;
        boost = far ? 3.2 : 3.6 + 3.0 * close;
        turnMul = far ? 2.2 : 2.6 + 3.5 * close;
        crowd = far ? 0.8 : 0.35;
        if (bestD < 3.5 * k * R.cell) boost *= 0.45;
        if (bestD < (1.3 * k + 0.8) * R.cell && best.age > 0.4 && t >= (e.nextBite || 0)) {
          best.eaten = true;
          e.nextBite = t + rand(0.5, 0.9);
          addRipple(best.x, best.y, { dur: 0.7, maxR: 2.5, chars: "Â°", color: [170, 200, 230] });
          e.retargetAt = t + rand(0.4, 1.4);
        }
      }
    }

    if (!e.bokeh) {
      for (const o of entities) {
        if (o === e || o.leaving || Math.abs(o.z - e.z) > 0.35) continue;
        const ox = e.x - o.x;
        const oy = e.y - o.y;
        const d = Math.hypot(ox, oy);
        const lim = (reach + o.A.radius * scaleFor(o) * R.cell) * 0.75;
        if (d > 0 && d < lim) {
          const w = (1 - d / lim) * crowd;
          dx += (ox / d) * w;
          dy += (oy / d) * w;
        }
      }
    }

    if (scare > 0 && !e.bokeh) {
      dx += e.scareX * 7 * scare;
      dy += e.scareY * 7 * scare;
      boost *= 1 + 2.2 * scare;
      turnMul *= 1 + 4 * scare;
    }

    if (A.hoverShy && pointer.active && !e.bokeh) {
      const px = e.x - pointer.x;
      const py = e.y - pointer.y;
      const d = Math.hypot(px, py);
      const lim = reach + 70 * R.dpr;
      if (d > 0 && d < lim) {
        const w = (1 - d / lim) * 2.5;
        dx += (px / d) * w;
        dy += (py / d) * w;
        boost *= 1 + (1 - d / lim) * 0.9;
        turnMul *= 1.8;
      }
    }

    const desired = Math.atan2(dy, dx);
    const turn = A.turn * turnMul * dt;
    e.heading += clamp(angleDiff(desired, e.heading), -turn, turn);

    const parallax = e.bokeh ? 0.55 : 0.55 + 0.45 * e.z;
    const v = A.speed * e.speedMul * e.speedMod * sp * parallax * boost * R.cell * k * 0.6;
    e.x += Math.cos(e.heading) * v * dt;
    e.y += Math.sin(e.heading) * v * dt;

    // wrap around, re-entering at a fresh spot along the far edge
    const m = reach + 4 * R.cell;
    if (e.x < -m) {
      e.x = R.W + m;
      e.y = rand(0, R.H);
    } else if (e.x > R.W + m) {
      e.x = -m;
      e.y = rand(0, R.H);
    }
    if (e.y < -m) {
      e.y = R.H + m;
      e.x = rand(0, R.W);
    } else if (e.y > R.H + m) {
      e.y = -m;
      e.x = rand(0, R.W);
    }
  }

  entities = entities.filter((e) => !(e.leaving && e.fade <= 0));
  bokehs = bokehs.filter((e) => !(e.leaving && e.fade <= 0));
}

/* ---------- drawing ---------- */

const glyphs = [];

function rasterize(e, order, buf, transparentBg) {
  const A = e.A;
  const k = scaleFor(e);
  const cx = e.x / R.cell;
  const cy = e.y / R.cell;
  const rad = A.radius * k;
  const i0 = Math.max(0, Math.floor(cx - rad));
  const i1 = Math.min(R.cols - 1, Math.ceil(cx + rad));
  const j0 = Math.max(0, Math.floor(cy - rad));
  const j1 = Math.min(R.rows - 1, Math.ceil(cy + rad));
  if (i0 > i1 || j0 > j1) return;

  const ang = e.heading + (A.facing || 0);
  const cs = Math.cos(ang) / k;
  const sn = Math.sin(ang) / k;
  const bright = e.bokeh ? 1 : lerp(0.38, 1, e.z);
  const fade = e.fade;
  const tick = (simTime * 5) | 0;
  const cols = R.cols;
  const occ = R.occ;

  for (let j = j0; j <= j1; j++) {
    const dy = j + 0.5 - cy;
    for (let i = i0; i <= i1; i++) {
      const dx = i + 0.5 - cx;
      const u = dx * cs + dy * sn;
      const v = -dx * sn + dy * cs;
      if (!A.sample(u, v, e)) continue;
      const idx = j * cols + i;
      const a = out.a * fade;
      if (a <= 0.01) continue;

      if (out.ch) {
        if (transparentBg) continue;
        const set = out.ch;
        const ch = set.length > 1 ? set[(hash2(i, j, e.seed + tick) * set.length) | 0] : set;
        glyphs.push(i, j, order, out.r * bright, out.g * bright, out.b * bright, a * (0.45 + 0.55 * bright), ch);
        continue;
      }

      const jit = 0.86 + 0.28 * hash2(i, j, e.seed);
      let r = out.r * jit;
      let g = out.g * jit;
      let b = out.b * jit;
      if (out.shine && hash2(i, j, e.seed ^ 77) < out.shine * 0.18) {
        r = lerp(r, 245, 0.65);
        g = lerp(g, 248, 0.65);
        b = lerp(b, 255, 0.65);
      }

      if (transparentBg) {
        const al = clamp(a * 255, 0, 255) | 0;
        buf[idx] = (al << 24) | (clamp(b, 0, 255) << 16) | (clamp(g, 0, 255) << 8) | clamp(r, 0, 255);
        continue;
      }

      const p = buf[idx];
      const t = a * bright;
      const pr = p & 255;
      const pg = (p >>> 8) & 255;
      const pb = (p >>> 16) & 255;
      r = clamp(lerp(pr, r, t), 0, 255) | 0;
      g = clamp(lerp(pg, g, t), 0, 255) | 0;
      b = clamp(lerp(pb, b, t), 0, 255) | 0;
      buf[idx] = (255 << 24) | (b << 16) | (g << 8) | r;
      if (a > 0.5) occ[idx] = order;
    }
  }
}

function emitTrails(e, dt) {
  if (!settings.trails || e.bokeh || e.fade < 0.5) return;
  const A = e.A;
  const tr = A.trail;
  const k = scaleFor(e);
  const ang = e.heading + (A.facing || 0);
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  e.trailFlip = (e.trailFlip + 1) % tr.at.length;
  const [tu, tv] = tr.at[e.trailFlip];
  const wx = e.x / R.cell + (tu * c - tv * s) * k;
  const wy = e.y / R.cell + (tu * s + tv * c) * k;
  const i = Math.floor(wx);
  const j = Math.floor(wy);
  if (i < 0 || j < 0 || i >= R.cols || j >= R.rows) return;
  const idx = j * R.cols + i;
  if (idx === e.lastTrail) return;
  e.lastTrail = idx;
  if (Math.random() > 0.75) return;
  const bright = lerp(0.35, 0.9, e.z);
  R.tLife[idx] = bright;
  R.tChar[idx] = (Math.random() * tr.chars.length) | 0;
  R.tCol[idx * 3] = tr.color[0];
  R.tCol[idx * 3 + 1] = tr.color[1];
  R.tCol[idx * 3 + 2] = tr.color[2];
}

let trailChars = ".";

function render(dt) {
  const buf = R.buf;
  buf.fill(BG_PACKED);
  R.occ.fill(-1);
  glyphs.length = 0;

  const sorted = entities.slice().sort((a, b) => a.z - b.z);
  for (let n = 0; n < sorted.length; n++) {
    rasterize(sorted[n], n, buf, false);
    emitTrails(sorted[n], dt);
  }
  drawFood(buf);

  R.loCtx.putImageData(R.img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(R.lo, 0, 0, R.cols * R.cell, R.rows * R.cell);
  ctx.drawImage(R.overlay, 0, 0);

  ctx.font = R.font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const half = R.cell / 2 + R.line / 2;

  // trails fade out underneath the animals
  const A = ANIMAL_BY_ID[current];
  trailChars = A.trail.chars;
  const life = R.tLife;
  const decay = dt / A.trail.life;
  const occ = R.occ;
  for (let idx = 0; idx < life.length; idx++) {
    const l = life[idx];
    if (l <= 0) continue;
    const nl = l - decay;
    life[idx] = nl;
    if (nl <= 0.02 || occ[idx] >= 0) continue;
    const i = idx % R.cols;
    const j = (idx / R.cols) | 0;
    ctx.fillStyle = `rgba(${R.tCol[idx * 3]},${R.tCol[idx * 3 + 1]},${R.tCol[idx * 3 + 2]},${(nl * 0.55).toFixed(3)})`;
    ctx.fillText(trailChars[R.tChar[idx] % trailChars.length], i * R.cell + half, j * R.cell + half);
  }

  for (let g = 0; g < glyphs.length; g += 8) {
    const i = glyphs[g];
    const j = glyphs[g + 1];
    const order = glyphs[g + 2];
    if (occ[j * R.cols + i] > order) continue;
    ctx.fillStyle = `rgba(${glyphs[g + 3] | 0},${glyphs[g + 4] | 0},${glyphs[g + 5] | 0},${glyphs[g + 6].toFixed(3)})`;
    ctx.fillText(glyphs[g + 7], i * R.cell + half, j * R.cell + half);
  }

  drawRipples(half);

  // out-of-focus foreground animals
  bctx.clearRect(0, 0, R.W, R.H);
  if (bokehs.length) {
    R.bbuf.fill(0);
    for (const b of bokehs) rasterize(b, 0, R.bbuf, true);
    R.bloCtx.putImageData(R.bimg, 0, 0);
    bctx.imageSmoothingEnabled = false;
    bctx.drawImage(R.blo, 0, 0, R.cols * R.cell, R.rows * R.cell);
  }
}

// pellets float on the surface, so they sit above the koi
const FOOD = [204, 126, 58];
function drawFood(buf) {
  const occ = R.occ;
  for (const f of foods) {
    const i = Math.floor(f.x / R.cell);
    const j = Math.floor(f.y / R.cell);
    if (i < 0 || j < 0 || i >= R.cols || j >= R.rows) continue;
    const pop = clamp(f.age / 0.18, 0, 1);
    const a = pop * clamp((f.life - f.age) / 2.5, 0, 1);
    if (a <= 0.02) continue;
    const idx = j * R.cols + i;
    const p = buf[idx];
    const r = clamp(lerp(p & 255, FOOD[0] * f.tint, a), 0, 255) | 0;
    const g = clamp(lerp((p >>> 8) & 255, FOOD[1] * f.tint, a), 0, 255) | 0;
    const b = clamp(lerp((p >>> 16) & 255, FOOD[2] * f.tint, a), 0, 255) | 0;
    buf[idx] = (255 << 24) | (b << 16) | (g << 8) | r;
    occ[idx] = 32000;
  }
}

function drawRipples(half) {
  for (const rp of ripples) {
    const p = clamp(rp.age / rp.dur, 0, 1);
    const radius = 0.6 + rp.maxR * (1 - Math.pow(1 - p, 2.2));
    const alpha = Math.pow(1 - p, 1.3) * 0.8;
    if (alpha <= 0.02) continue;
    const ci = rp.x / R.cell;
    const cj = rp.y / R.cell;
    const n = Math.max(8, Math.ceil(TAU * radius * 1.15));
    const seen = new Set();
    ctx.fillStyle = `rgba(${rp.color[0] | 0},${rp.color[1] | 0},${rp.color[2] | 0},${alpha.toFixed(3)})`;
    for (let q = 0; q < n; q++) {
      const a = (q / n) * TAU;
      const i = Math.floor(ci + Math.cos(a) * radius);
      const j = Math.floor(cj + Math.sin(a) * radius);
      const key = i * 65536 + j;
      if (seen.has(key) || i < 0 || j < 0 || i >= R.cols || j >= R.rows) continue;
      seen.add(key);
      ctx.fillText(rp.chars[q % rp.chars.length], i * R.cell + half, j * R.cell + half);
    }
  }
}

let last = 0;
function frame(now) {
  const dt = last ? clamp((now - last) / 1000, 0, 0.05) : 0.016;
  last = now;
  step(dt);
  render(dt);
  animationId = requestAnimationFrame(frame);
}


resize();
syncPopulation(true);
render(0);

window.addEventListener("resize", () => {
  resize();
  syncPopulation();
}, { signal });
window.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || !event.isPrimary) return;
  tap(event.clientX * R.dpr, event.clientY * R.dpr);
}, { signal });
window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX * R.dpr;
  pointer.y = event.clientY * R.dpr;
  pointer.active = true;
}, { signal });
document.addEventListener("pointerleave", () => { pointer.active = false; }, { signal });
window.addEventListener("blur", () => { pointer.active = false; }, { signal });
document.addEventListener("visibilitychange", () => {
  cancelAnimationFrame(animationId);
  last = 0;
  if (!document.hidden) animationId = requestAnimationFrame(frame);
}, { signal });
reducedMotion.addEventListener("change", () => syncPopulation(), { signal });
if (!document.hidden) animationId = requestAnimationFrame(frame);

return () => {
  events.abort();
  cancelAnimationFrame(animationId);
};
}
