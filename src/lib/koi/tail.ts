// A stylized body-and-caudal-fin model, not a fluid simulation. Motion travels
// rearward along an inextensible centerline; the sampler keeps its existing art.
// Research: https://pmc.ncbi.nlm.nih.gov/articles/PMC8670443/
const ROOT = 3.6
const END = -12.6
const SEGMENTS = 32
const STEP = (ROOT - END) / SEGMENTS
const TAU = Math.PI * 2
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
export type Tail = {
  phase: number; amplitude: number; frequency: number; bend: number
  heading: number; speed: number; x: Float64Array; y: Float64Array
}

export function createTail(phase: number, heading: number): Tail {
  const state: Tail = { phase, amplitude: 0.15, frequency: 0.12, bend: 0,
    heading, speed: 0, x: new Float64Array(SEGMENTS + 1), y: new Float64Array(SEGMENTS + 1) }
  buildSpine(state)
  return state
}

// Amplitude grows toward the rear while phase is delayed toward the tail.
// A positive heading change curves the trailing body into the previous path.
export function lateralOffset(progress: number, phase: number, amplitude: number, bend: number) {
  const s = clamp(progress, 0, 1)
  const envelope = s * s
  return amplitude * envelope * Math.sin(phase - s * 3.8) + bend * 5 * envelope
}

export function buildSpine(tail: Tail) {
  tail.x[0] = ROOT; tail.y[0] = 0
  for (let i = 1; i <= SEGMENTS; i++) {
    const desired = lateralOffset(i / SEGMENTS, tail.phase, tail.amplitude, tail.bend)
    const dy = clamp(desired - tail.y[i - 1], -STEP * 0.78, STEP * 0.78)
    // Every segment keeps its length, including at the tail-fin attachment.
    tail.x[i] = tail.x[i - 1] - Math.sqrt(STEP * STEP - dy * dy)
    tail.y[i] = tail.y[i - 1] + dy
  }
}

export function updateTail(tail: Tail, dt: number, heading: number, speed: number, sway: number, individualRate = 1) {
  if (dt <= 0) return
  const turn = Math.atan2(Math.sin(heading - tail.heading), Math.cos(heading - tail.heading)) / dt
  tail.heading = heading
  const blend = 1 - Math.exp(-dt / 0.18)
  tail.speed += (Math.max(0, speed) - tail.speed) * blend
  // Speed is measured in sprite units per second, independent of orientation,
  // device pixel ratio, depth, or sprite size. Faster swimming primarily changes
  // beat frequency; amplitude increases modestly and stays bounded.
  const targetFrequency = clamp(0.12 + tail.speed * 0.105, 0.12, 1.9) * individualRate
  tail.frequency += (targetFrequency - tail.frequency) * blend
  const targetAmplitude = (0.15 + 1.7 * tail.speed / (tail.speed + 3.5)) * (0.65 + sway * 0.6)
  tail.amplitude += (targetAmplitude - tail.amplitude) * blend
  const targetBend = clamp(turn * 5 / (tail.speed + 3), -0.65, 0.65)
  tail.bend += (targetBend - tail.bend) * (1 - Math.exp(-dt / 0.24))
  tail.phase = (tail.phase + TAU * tail.frequency * dt) % TAU
  buildSpine(tail)
}

export function spinePoint(tail: Tail, materialU: number, materialV = 0) {
  if (materialU >= ROOT) return { u: materialU, v: materialV }
  const index = clamp((ROOT - materialU) / STEP, 0, SEGMENTS)
  const i = Math.min(SEGMENTS - 1, Math.floor(index)), t = index - i
  const dx = tail.x[i] - tail.x[i + 1], dy = tail.y[i] - tail.y[i + 1]
  return { u: tail.x[i] + (tail.x[i + 1] - tail.x[i]) * t - dy / STEP * materialV,
    v: tail.y[i] + (tail.y[i + 1] - tail.y[i]) * t + dx / STEP * materialV }
}

export type MaterialPoint = { u: number; v: number }
// Invert the bend for the existing pixel sampler. Project onto the local body
// normal rather than horizontally shearing each cross-section of the fish.
export function unbendPoint(tail: Tail, u: number, v: number, result: MaterialPoint) {
  if (u >= ROOT) { result.u = u; result.v = v; return }
  let lo = 0, hi = SEGMENTS
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (tail.x[mid] > u) lo = mid; else hi = mid }
  let best = Infinity, bestIndex = lo, bestT = 0, bestV = 0
  for (let i = Math.max(0, lo - 2); i <= Math.min(SEGMENTS - 1, lo + 2); i++) {
    const dx = tail.x[i + 1] - tail.x[i], dy = tail.y[i + 1] - tail.y[i]
    const t = clamp(((u - tail.x[i]) * dx + (v - tail.y[i]) * dy) / (STEP * STEP),
      i === 0 ? -2 : 0, i === SEGMENTS - 1 ? 4 : 1)
    const rx = u - tail.x[i] - dx * t, ry = v - tail.y[i] - dy * t
    const distance = rx * rx + ry * ry
    if (distance < best) {
      best = distance; bestIndex = i; bestT = t
      bestV = (rx * dy - ry * dx) / STEP
    }
  }
  result.u = ROOT - (bestIndex + bestT) * STEP
  result.v = bestV
}
