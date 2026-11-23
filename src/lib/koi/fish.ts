import { createTail, unbendPoint, type Tail } from './tail'

// Koi sampler adapted from Pawan-webdeveloper/Ascii-Animals-extension (MIT).
type Color = readonly [number, number, number]
type Palette = { base: Color; patch: Color; thr: number; dark?: Color; fin: Color }

function palette(base: Color, patch: Color, thr: number, dark?: Color): Palette {
  const fin: Color = [lerp(base[0], 240, 0.25), lerp(base[1], 244, 0.25), lerp(base[2], 255, 0.25)]
  return { base, patch, thr, dark, fin }
}

const palettes = [
  palette([255, 251, 231], [235, 65, 42], 0.5),
  palette([253, 248, 229], [221, 53, 37], 0.55, [35, 49, 51]),
  palette([255, 219, 67], [245, 194, 42], 0.72),
  palette([248, 133, 54], [255, 194, 103], 0.68),
  palette([246, 251, 243], [207, 225, 224], 0.6),
]
const paletteOrder = [0, 1, 2, 4, 0, 2, 1, 3, 4, 0, 2, 1]
const eye: Color = [22, 22, 26]
const tau = Math.PI * 2

export type KoiFish = {
  x: number; y: number; z: number; heading: number
  seed: number; pal: Palette; rateMul: number; speedMul: number; tail: Tail
}

// Slot is the zero-based position in the pond's spawn sequence.
export function createKoiFish(slot: number, position: { x: number; y: number; z?: number }, random = Math.random): KoiFish {
  const z = position.z ?? Math.pow(random(), 0.85)
  const phase = random() * tau
  const rateMul = 0.85 + random() * (1.15 - 0.85)
  const speedMul = 0.75 + random() * (1.25 - 0.75)
  const heading = random() * tau
  return {
    x: position.x, y: position.y, z, heading,
    seed: ((slot + 1) * 2654435761) >>> 16,
    pal: palettes[paletteOrder[slot % paletteOrder.length]],
    rateMul, speedMul, tail: createTail(phase, heading),
  }
}

export function hash2(i: number, j: number, seed: number) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 1442695041)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function noise(x: number, y: number, seed: number) {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = x - xi, yf = y - yi
  const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed)
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed)
  return lerp(lerp(a, b, sx), lerp(c, d, sx), sy)
}

export type KoiSample = { r: number; g: number; b: number; a: number; shine: number }

function hit(out: KoiSample, color: Color, alpha = 1, shine = 0, brightness = 1) {
  out.r = color[0] * brightness
  out.g = color[1] * brightness
  out.b = color[2] * brightness
  out.a = alpha
  out.shine = shine
  return true
}

const materialPoint = { u: 0, v: 0 }
const square = (n: number) => n * n

// Coordinates are in sprite units. +u faces forward, v is lateral.
// Only hits write to the caller's reusable sample.
export function sampleKoi(u: number, v: number, fish: KoiFish, out: KoiSample): boolean {
  unbendPoint(fish.tail, u, v, materialPoint)
  u = materialPoint.u
  v = materialPoint.v
  if (u < -12.6 || u > 8.4) return false
  const { pal, seed } = fish
  const av = Math.abs(v)
  let halfWidth = 0
  if (u > 3.6) halfWidth = 3 * Math.sqrt(Math.max(0, 1 - square((u - 3.6) / 4.7)))
  else if (u > -8) halfWidth = 0.75 + 2.25 * Math.pow((u + 8) / 11.6, 1.25)
  if (av < halfWidth) {
    if (u > 5.5 && u < 6.9 && av > halfWidth - 1.15 && av < halfWidth - 0.2) return hit(out, eye)
    const n = noise(u * 0.3 + seed * 7, v * 0.42, seed)
    let color = n > pal.thr ? pal.patch : pal.base
    if (pal.dark && noise(u * 0.45, v * 0.5 + 9, seed + 3) > 0.68) color = pal.dark
    const brightness = halfWidth - av < 0.65 ? 0.78 : av < 0.5 ? 1.05 : 1
    return hit(out, color, 1, 0.2, brightness)
  }
  if (u > 0.2 && u < 3.4) {
    const finU = (u + (av - halfWidth) * 0.45 - 1.6) / 1.3
    const finV = (av - (halfWidth + 1.1)) / 1.3
    if (square(finU) + square(finV) < 1) return hit(out, pal.fin, 0.55)
  }
  if (u <= -7.4) {
    const t = -7.4 - u
    const finWidth = 0.55 + t * 0.72
    if (av < finWidth && !(t > 3.7 && av < (t - 3.7) * 1.1)) return hit(out, pal.fin, 0.62)
  }
  return false
}
