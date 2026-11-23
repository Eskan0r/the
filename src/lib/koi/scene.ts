// @ts-nocheck
import { updateTail, spinePoint } from './tail'
import { createKoiFish, hash2, koiPopulation, sampleKoi } from './fish'
import { createPond } from './environment'
import { beginBite, advanceBite, prepareBite } from './bite'
import { pondBoundary } from './boundary'
import { createCursorCarry, advanceCursor, releaseCursor, movePondPointer } from './cursor'
import { WaterSurface } from './water'
import { drawDock } from './dock'
import { PondSunlight } from './sunlight'
import { createKoiBehavior, chooseKoiSpawn, planKoiBehavior, advanceKoiCruise } from './behavior'
import type { PondAssets } from './assets'
import { showLoadError, type KoiIntro } from './intro'
import { startWaterWash } from './wash'
// Koi scene adapted from Pawan-webdeveloper/Ascii-Animals-extension (MIT).
// Upstream: https://github.com/Pawan-webdeveloper/Ascii-Animals-extension
// See LICENSE in this directory. Only the koi sampler and canvas engine
// are retained; extension UI, storage, and browser APIs are not used.

export function startKoi(world: HTMLCanvasElement, bokehCanvas: HTMLCanvasElement, assets: PondAssets, atlas: Uint8Array[], intro?: KoiIntro): () => void {
const ctx = world.getContext("2d", { alpha: false });
const bctx = bokehCanvas.getContext("2d");
if (!ctx || !bctx) throw new Error("Unable to draw the pond on this device");
let animationId = 0;
const events = new AbortController();
const { signal } = events;
const featured = intro?.fish;
const reservedSlot = intro?.slot;
const startedWithIntro = !!intro;
let suspended = !!intro;
let swimming = !intro;
let stopWash;
let firstFrameDrawn = false;
const TAU = Math.PI * 2;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const angleDiff = (a, b) => {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

// ---------- sampler output (reused to avoid allocations) ----------

const out = { r: 0, g: 0, b: 0, a: 1, ch: null, shine: 0 };

const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
const WHITE = [240, 244, 255];

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
    sample: sampleKoi,
  },
];
const ANIMAL_BY_ID = Object.fromEntries(ANIMALS.map((a) => [a.id, a]));

const settings = {
  density: 1, speed: 1, size: 1.9, depth: 0.6, sway: 0.5,
  cell: 4, trails: true, bokeh: false, reach: 220, scare: 1,
  tune: { koi: { direction: 0, spread: 0.9 } },
};
const DEFAULTS = { animal: "koi" };
const GRID_LINE = "rgba(31, 83, 76, 0.025)";
let pond;
let sunlight;
let waterSurface;
let submergedPixels;

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
  pond = createPond(R.cols, R.rows, assets);
  sunlight = new PondSunlight(R.cols, R.rows, R.cell / R.dpr, atlas);
  waterSurface = new WaterSurface(window.innerWidth, window.innerHeight);
  submergedPixels = new Uint32Array(n);
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
  rg.addColorStop(1, "rgba(13,65,72,0.12)");
  g.fillStyle = rg;
  g.fillRect(0, 0, R.W, R.H);
}

/* ---------- entities ---------- */

let entities = [];
let bokehs = [];
let nextFishSlot = 0;
let simTime = 0;
let current = DEFAULTS.animal; // the animal shown in this tab (can differ from the saved pick in random mode)
const pointer = { x: -1e9, y: -1e9, active: false, virtual: false, physicalX: undefined, physicalY: undefined };
let pointerKind = "mouse";
let contact = null;
const cursorCarry = createCursorCarry();
const cursorHost = world.parentElement || world;
const originalCursor = cursorHost.style.cursor;
const cursorImage = new Image();
cursorImage.src = '/cursors/windows-arrow.png';
function dropCursor(resetPosition = false) {
  releaseCursor(cursorCarry);
  if (resetPosition) {
    pointer.virtual = false;
    pointer.physicalX = pointer.physicalY = undefined;
  }
  cursorHost.style.cursor = pointer.virtual ? "none" : originalCursor;
}
function mouthPoint(e) {
  const unit = scaleFor(e) * R.cell;
  return { fish: e, x: e.x + Math.cos(e.heading) * 8 * unit, y: e.y + Math.sin(e.heading) * 8 * unit };
}
const foods = []; // koi pellets: { x, y, vx, vy, age, life, tint }
const ripples = []; // tap feedback: { x, y, age, dur, maxR, chars, color }

function scaleFor(e) {
  const far = 1 - settings.depth * 0.62;
  return settings.size * clamp(window.innerWidth / 1000, 0.6, 1) * (e.A.scale || 1) * lerp(far, 1.12, e.z) * (e.bokeh ? 1.7 : 1);
}

function makeEntity(A, opts = {}, fish = undefined) {
  if (!fish) {
    if (nextFishSlot === reservedSlot) nextFishSlot++;
    const spawn = chooseKoiSpawn(R.W, R.H, entities.filter(e => !e.leaving));
    fish = createKoiFish(nextFishSlot++, { x: opts.x ?? spawn.x, y: opts.y ?? spawn.y, z: opts.z });
  }
  return Object.assign(fish, {
    A,
    behavior: createKoiBehavior(fish.seed),
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
  });
}

function desiredCount(A) {
  return koiPopulation(window.innerWidth, window.innerHeight, A.count, settings.density);
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
  waterSurface.splash(x / R.dpr, y / R.dpr);
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
  simTime += dt * motion;
  const t = simTime;
  const all = entities.concat(bokehs);
  const neighbors = entities.filter(e => !e.leaving).map(e => ({ id: e.seed, x: e.x, y: e.y, heading: e.heading,
    speed: e.behavior.speed ?? 0, radius: e.A.radius * scaleFor(e) * R.cell }));
  const reachPx = tapReach();
  const guests = entities.filter(e => !e.leaving && e.fade > 0.8 && (!e.bite || cursorCarry.carrier === e)).map(mouthPoint);
  advanceCursor(cursorCarry, dt, { ...pointer, active: pointer.active && pointerKind === "mouse" }, guests, R.dpr);
  cursorHost.style.cursor = cursorCarry.carrier || pointer.virtual ? "none" : originalCursor;

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

    e.fade = e.leaving ? Math.max(0, e.fade - dt / 0.6) : Math.min(1, e.fade + dt / 0.9);
    if (e.scared > 0) e.scared = Math.max(0, e.scared - dt / 1.4);
    const scare = e.scared * settings.scare;

    e.speedMod = 1;
    e.phaseMod = 1;
    if (scare > 0) {
      e.speedMod = Math.max(e.speedMod, 0.9);
      e.phaseMod = Math.max(e.phaseMod, 1) * (1 + scare * 1.6);
    }

    // Preserve the held pause, longer lunge, and recovery around each pellet.
    const bite = advanceBite(e, foods, dt * motion, t);
    if (bite.active) {
      e.behavior.speed = bite.speed;
      e.behavior.turnRate = 0;
      if (bite.eaten) addRipple(bite.eaten.x, bite.eaten.y, { dur: 0.7, maxR: 2.5, chars: "~", color: [170, 200, 230] });
      updateTail(e.tail, dt * motion, e.heading, bite.speed / (scaleFor(e) * R.cell), settings.sway, e.rateMul);
      continue;
    }

    const k = scaleFor(e);
    const reach = A.radius * k * R.cell;
    const parallax = e.bokeh ? 0.55 : 0.55 + 0.45 * e.z;
    const baseSpeed = A.speed * e.speedMul * e.speedMod * settings.speed * parallax * R.cell * k * 0.6;
    const plan = planKoiBehavior(e, e.bokeh ? [] : neighbors, R.W, R.H, reach, baseSpeed, t);
    let dx = plan.x, dy = plan.y;
    let boost = 1;
    let turnMul = 1;
    let crowd = 1;

    // koi: find the nearest pellet in range and go for it
    if (A.feeds && foods.length && !e.bokeh && !e.leaving) {
      const hx = e.x + Math.cos(e.heading) * 6.5 * k * R.cell;
      const hy = e.y + Math.sin(e.heading) * 6.5 * k * R.cell;
      // close koi rush in; koi further out notice more slowly and drift over
      const sense = reachPx * 2.6;
      let best = e.meal && !e.meal.eaten && foods.includes(e.meal) && e.meal.age < e.meal.life ? e.meal : null;
      let bestD = best ? Math.hypot(best.x - hx, best.y - hy) : sense;
      if (!best) for (const f of foods) {
        if (f.eaten || all.some(other => other !== e && (other.meal === f || other.bite?.pellet === f))) continue;
        const distance = Math.hypot(f.x - hx, f.y - hy);
        if (distance < bestD) {
          bestD = distance;
          best = f;
        }
      }
      e.meal = best;
      if (best) {
        if (prepareBite(e, best, k * R.cell, dt * motion)) {
          e.behavior.speed = 0;
          e.behavior.turnRate = 0;
          beginBite(e, best, k * R.cell, t);
          updateTail(e.tail, dt * motion, e.heading, 0, settings.sway, e.rateMul);
          continue;
        }
        const close = clamp(1 - bestD / reachPx, 0, 1);
        const far = bestD > reachPx;
        const fx = (best.x - hx) / (bestD || 1);
        const fy = (best.y - hy) / (bestD || 1);
        const pull = far ? 2.2 : 3 + 5 * close;
        dx += fx * pull;
        dy += fy * pull;
        boost = far ? 3.2 : 3.6 + 3.0 * close;
        turnMul = far ? 2.2 : 2.6 + 3.5 * close;
        crowd = 0.7;
        if (bestD < 3.5 * k * R.cell) boost *= 0.45;
      }
    }

    // One curious fish approaches an idle cursor; ownership blocks all others.
    if (cursorCarry.interested === e && !foods.length) {
      const mouth = mouthPoint(e);
      const gap = Math.hypot(pointer.x - mouth.x, pointer.y - mouth.y) || 1;
      dx += (pointer.x - mouth.x) / gap * 6;
      dy += (pointer.y - mouth.y) / gap * 6;
      boost = Math.min(1.5, Math.max(0.4, gap / (40 * R.dpr)));
      turnMul = Math.max(turnMul, 3);
      crowd = 0.7;
    }

    dx += plan.avoidX * crowd;
    dy += plan.avoidY * crowd;
    turnMul = Math.max(turnMul, 1 + plan.avoidUrgency);

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

    const targetSpeed = baseSpeed * boost * plan.speedFactor;
    const edge = pondBoundary(e.x, e.y, e.heading, targetSpeed, reach, R.W, R.H);
    const edgeStrength = Math.hypot(edge.x, edge.y);
    if (edgeStrength > 0) {
      const length = Math.hypot(dx, dy) || 1;
      dx = dx / length + edge.x;
      dy = dy / length + edge.y;
      turnMul = Math.max(turnMul, 1 + Math.min(1.5, edgeStrength * 0.5));
    }
    const v = advanceKoiCruise(e, dx, dy, targetSpeed, baseSpeed, dt * motion, Math.min(2.2, turnMul));
    // Propulsive tail beats soften during a glide while forward inertia remains.
    updateTail(e.tail, dt * motion, e.heading, v / (R.cell * k), settings.sway, e.rateMul, plan.stroke || boost > 1.5 ? 1 : 0.28);

    // No wrapping: a fish that drifts out turns back through the same edge.
  }

  entities = entities.filter((e) => !(e.leaving && e.fade <= 0));
  bokehs = bokehs.filter((e) => !(e.leaving && e.fade <= 0));
}

/* ---------- drawing ---------- */

const glyphs = [];

function rasterize(e, order, buf, transparentBg, shadow = false) {
  const A = e.A;
  const k = scaleFor(e);
  const offset = shadow ? lerp(7, 3, e.z) : 0;
  const cx = e.x / R.cell + offset;
  const cy = e.y / R.cell + offset * 1.25;
  const rad = (A.radius + 2) * k; // room for the rotated caudal fin during a turn
  const i0 = Math.max(0, Math.floor(cx - rad));
  const i1 = Math.min(R.cols - 1, Math.ceil(cx + rad));
  const j0 = Math.max(0, Math.floor(cy - rad));
  const j1 = Math.min(R.rows - 1, Math.ceil(cy + rad));
  if (i0 > i1 || j0 > j1) return;

  const ang = e.heading + (A.facing || 0);
  const cs = Math.cos(ang) / k;
  const sn = Math.sin(ang) / k;
  const bright = e.bokeh ? 1 : lerp(0.82, 1, e.z);
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
      if (!A.sample(u, v, e, out)) continue;
      const idx = j * cols + i;
      const a = out.a * fade;
      if (a <= 0.01) continue;
      if (shadow) {
        const p = buf[idx], opacity = a * 0.22;
        const r = lerp(p & 255, 24, opacity) | 0;
        const g = lerp((p >>> 8) & 255, 75, opacity) | 0;
        const b = lerp((p >>> 16) & 255, 78, opacity) | 0;
        buf[idx] = (255 << 24) | (b << 16) | (g << 8) | r;
        continue;
      }

      if (out.ch) {
        if (transparentBg) continue;
        const set = out.ch;
        const ch = set.length > 1 ? set[(hash2(i, j, e.seed + tick) * set.length) | 0] : set;
        glyphs.push(i, j, order, out.r * bright, out.g * bright, out.b * bright, a * (0.45 + 0.55 * bright), ch);
        continue;
      }

      const jit = (0.96 + 0.08 * hash2(i, j, e.seed)) * (1.02 - (dx + dy) / rad * 0.06);
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
  const attachment = tr.at[e.trailFlip];
  const { u: tu, v: tv } = spinePoint(e.tail, attachment[0], attachment[1]);
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
  buf.set(pond.pixels);
  // Cast shadows on the floor before lighting it. Fish remain above the ribbons.
  for (const e of entities) rasterize(e, -1, buf, false, true);
  sunlight.update(reducedMotion.matches ? 0 : simTime);
  sunlight.apply(buf, pond.causticMask);
  R.occ.fill(-1);
  glyphs.length = 0;

  const sorted = entities.slice().sort((a, b) => a.z - b.z);
  for (let n = 0; n < sorted.length; n++) {
    rasterize(sorted[n], n, buf, false);
    if (dt || !suspended) emitTrails(sorted[n], dt);
  }
  sunlight.apply(buf, undefined, R.occ);
  waterSurface.refract(buf, submergedPixels, R.cols, R.rows, R.cell / R.dpr);
  drawFood(buf);

  R.loCtx.putImageData(R.img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(R.lo, 0, 0, R.cols * R.cell, R.rows * R.cell);
  ctx.drawImage(pond.surface, 0, 0, R.cols * R.cell, R.rows * R.cell);
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
  drawDock(bctx, R.W, R.H, R.dpr, assets);
  drawCarriedCursor();
}

function drawCarriedCursor() {
  if (!cursorCarry.carrier && !pointer.virtual) return;
  const position = cursorCarry.carrier ? mouthPoint(cursorCarry.carrier) : pointer;
  const x = position.x / R.dpr, y = position.y / R.dpr;
  // An arrow at native cursor size, above the pond and its pixel grid.
  ctx.save();
  ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
  ctx.translate(x, y);
  if (cursorImage.complete && cursorImage.naturalWidth) {
    ctx.drawImage(cursorImage, 0, 0, 32, 32);
    ctx.restore();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 18); ctx.lineTo(5, 13);
  ctx.lineTo(9, 21); ctx.lineTo(12, 19); ctx.lineTo(8, 12);
  ctx.lineTo(15, 12); ctx.closePath();
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#101619"; ctx.lineWidth = 1.5;
  ctx.lineJoin = "round"; ctx.fill(); ctx.stroke();
  ctx.restore();
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
  waterSurface.advance(dt, { x: pointer.x / R.dpr, y: pointer.y / R.dpr, active: pointer.active && !cursorCarry.carrier }, reducedMotion.matches ? 0.2 : 1);
  render(dt);
  animationId = requestAnimationFrame(frame);
}


function startSwimming() {
  if (swimming) return;
  swimming = true;
  last = 0;
  if (!document.hidden) animationId = requestAnimationFrame(frame);
}

function releaseFish() {
  if (!suspended || signal.aborted) return;
  suspended = false;
  stopWash?.();
  stopWash = undefined;
  intro.stop();
  intro = undefined;
  startSwimming();
}

resize();
if (featured) entities.push(makeEntity(ANIMAL_BY_ID[current], { fade: 1 }, featured));
syncPopulation(true);
if (intro) {
  void intro.minimumVisible.then(() => {
    if (signal.aborted) return;
    render(0);
    firstFrameDrawn = true;
    intro.finish(skip => {
      if (signal.aborted) return;
      if (skip) releaseFish();
      else {
        stopWash = startWaterWash(intro.host, releaseFish);
        startSwimming();
      }
    });
  }).catch(error => {
    if (!signal.aborted) { events.abort(); showLoadError(error); }
  });
} else render(0);

window.addEventListener("resize", () => {
  clearContact();
  dropCursor(true);
  pointer.active = false;
  resize();
  syncPopulation(suspended);
  if (suspended) {
    entities = entities.filter(e => !e.leaving);
    if (firstFrameDrawn && !swimming) render(0);
  }
}, { signal });
window.addEventListener("pointerdown", (event) => {
  if (suspended) return;
  if (event.button !== 0 || !event.isPrimary) return;
  pointerKind = event.pointerType;
  if (event.pointerType !== "mouse") {
    event.preventDefault();
    dropCursor(true);
    waterSurface.release();
    contact = { id: event.pointerId, x: event.clientX, y: event.clientY, started: performance.now(), dragged: false };
    movePondPointer(pointer, event.clientX * R.dpr, event.clientY * R.dpr, R.W, R.H);
    waterSurface.queuePointer(event.clientX, event.clientY);
    waterSurface.splash(event.clientX, event.clientY, 0.35);
    cursorHost.setPointerCapture(event.pointerId);
    return;
  }
  if (cursorCarry.carrier) {
    const mouth = mouthPoint(cursorCarry.carrier);
    pointer.x = clamp(mouth.x, 0, R.W - 1);
    pointer.y = clamp(mouth.y, 0, R.H - 1);
    pointer.virtual = true;
  }
  dropCursor();
  if (event.button !== 0 || !event.isPrimary) return;
  tap(pointer.virtual ? pointer.x : event.clientX * R.dpr, pointer.virtual ? pointer.y : event.clientY * R.dpr);
}, { signal });
window.addEventListener("pointermove", (event) => {
  if (suspended) return;
  if (event.pointerType !== "mouse") {
    if (!contact || contact.id !== event.pointerId) return;
    event.preventDefault();
    const samples = event.getCoalescedEvents?.() || [];
    for (const sample of samples.length ? samples : [event]) {
      if (Math.hypot(sample.clientX - contact.x, sample.clientY - contact.y) > 6) contact.dragged = true;
      movePondPointer(pointer, sample.clientX * R.dpr, sample.clientY * R.dpr, R.W, R.H);
      waterSurface.queuePointer(pointer.x / R.dpr, pointer.y / R.dpr);
    }
    return;
  }
  if (contact) return;
  pointerKind = "mouse";
  const samples = event.getCoalescedEvents?.() || [];
  for (const sample of samples.length ? samples : [event]) {
    const x = sample.clientX * R.dpr, y = sample.clientY * R.dpr;
    const moved = x !== pointer.physicalX || y !== pointer.physicalY;
    movePondPointer(pointer, x, y, R.W, R.H, moved && cursorCarry.carrier ? mouthPoint(cursorCarry.carrier) : undefined);
    if (moved) dropCursor();
    waterSurface.queuePointer(pointer.x / R.dpr, pointer.y / R.dpr);
  }
}, { signal });
function clearContact() {
  const id = contact?.id;
  contact = null;
  if (id !== undefined && cursorHost.hasPointerCapture(id)) cursorHost.releasePointerCapture(id);
}
function endContact(event, cancelled = false) {
  if (!contact || contact.id !== event.pointerId) return;
  const gesture = contact;
  if (!cancelled) {
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 6) gesture.dragged = true;
    waterSurface.queuePointer(event.clientX, event.clientY);
  }
  pointer.active = false;
  waterSurface.finishPointer();
  clearContact();
  if (!cancelled && !gesture.dragged && performance.now() - gesture.started < 450) tap(event.clientX * R.dpr, event.clientY * R.dpr);
}
window.addEventListener("pointerup", event => endContact(event), { signal });
window.addEventListener("pointercancel", event => endContact(event, true), { signal });
cursorHost.addEventListener("lostpointercapture", event => endContact(event, true), { signal });
cursorHost.addEventListener("contextmenu", event => { if (contact) event.preventDefault(); }, { signal });
document.addEventListener("pointerleave", () => { if (contact) return; pointer.active = false; waterSurface.finishPointer(); dropCursor(true); }, { signal });
window.addEventListener("blur", () => { clearContact(); pointer.active = false; waterSurface.release(); dropCursor(true); }, { signal });
document.addEventListener("visibilitychange", () => {
  clearContact();
  pointer.active = false;
  waterSurface.release();
  dropCursor(true);
  cancelAnimationFrame(animationId);
  last = 0;
  if (stopWash && document.hidden) releaseFish();
  else if (swimming && !document.hidden) animationId = requestAnimationFrame(frame);
}, { signal });
reducedMotion.addEventListener("change", () => {
  syncPopulation();
  if (stopWash && reducedMotion.matches) releaseFish();
}, { signal });
if (!startedWithIntro && !document.hidden) animationId = requestAnimationFrame(frame);

return () => {
  stopWash?.();
  if (suspended) intro?.stop();
  clearContact();
  dropCursor(true);
  events.abort();
  cancelAnimationFrame(animationId);
};
}
