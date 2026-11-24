// A stylized body-and-caudal-fin model, not a fluid simulation. Motion travels
// rearward along an inextensible centerline; the sampler keeps its existing art.
// Research: https://pmc.ncbi.nlm.nih.gov/articles/PMC8670443/
const ROOT = 3.6
const END = -12.6
const SEGMENTS = 32
const HISTORY_SIZE = SEGMENTS + 2
const STEP = (ROOT - END) / SEGMENTS
const TAU = Math.PI * 2
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
export type Tail = {
  phase: number; amplitude: number; frequency: number
  heading: number; speed: number; tightCurve: boolean; x: Float64Array; y: Float64Array
  pathHeadings: Float64Array; pathIndex: number; pathRemainder: number
}

export function createTail(phase: number, heading: number): Tail {
  const state: Tail = { phase, amplitude: 0.15, frequency: 0.12,
    heading, speed: 0, tightCurve: false, x: new Float64Array(SEGMENTS + 1), y: new Float64Array(SEGMENTS + 1),
    pathHeadings: new Float64Array(HISTORY_SIZE).fill(heading), pathIndex: 0, pathRemainder: 0 }
  buildSpine(state)
  return state
}

// Amplitude grows toward the rear while phase is delayed toward the tail.
export function lateralOffset(progress: number, phase: number, amplitude: number) {
  const s = clamp(progress, 0, 1)
  const envelope = s * s
  return amplitude * envelope * Math.sin(phase - s * 3.8)
}

export function buildSpine(tail: Tail) {
  tail.x[0] = ROOT; tail.y[0] = 0
  tail.tightCurve = false
  let previousOffset = 0
  let turnAngle = 0
  let pathHeading = tail.heading
  let previousPathDistance = 0
  let offsetFromNewest = 0
  for (let i = 1; i <= SEGMENTS; i++) {
    const distance = (i - 0.5) * STEP
    // Each segment uses the heading recorded when the head crossed this part of the path.
    while (distance > tail.pathRemainder + offsetFromNewest * STEP) {
      previousPathDistance = tail.pathRemainder + offsetFromNewest * STEP
      pathHeading = tail.pathHeadings[(tail.pathIndex - offsetFromNewest + HISTORY_SIZE) % HISTORY_SIZE]
      offsetFromNewest++
    }
    const nextDistance = tail.pathRemainder + offsetFromNewest * STEP
    const nextHeading = tail.pathHeadings[(tail.pathIndex - offsetFromNewest + HISTORY_SIZE) % HISTORY_SIZE]
    const heading = pathHeading + (nextHeading - pathHeading) * (distance - previousPathDistance) / (nextDistance - previousPathDistance)
    const wantedAngle = clamp(tail.heading - heading, -1.85, 1.85)
    turnAngle += clamp(wantedAngle - turnAngle, -0.12, 0.12)
    const offset = lateralOffset(i / SEGMENTS, tail.phase, tail.amplitude)
    const strokeAngle = Math.asin(clamp((offset - previousOffset) / STEP, -0.78, 0.78))
    const angle = turnAngle + strokeAngle * (1 - Math.min(0.85, Math.abs(turnAngle)))
    tail.tightCurve ||= Math.abs(angle) > 0.8
    tail.x[i] = tail.x[i - 1] - STEP * Math.cos(angle)
    tail.y[i] = tail.y[i - 1] + STEP * Math.sin(angle)
    previousOffset = offset
  }
}

export function updateTail(tail: Tail, dt: number, heading: number, speed: number, sway: number, individualRate = 1, effort = 1) {
  if (dt <= 0) return
  const turn = Math.atan2(Math.sin(heading - tail.heading), Math.cos(heading - tail.heading))
  const distance = Math.max(0, speed) * dt
  const samples = Math.floor((tail.pathRemainder + distance) / STEP)
  for (let i = Math.max(1, samples - HISTORY_SIZE + 1); i <= samples; i++) {
    const fraction = (i * STEP - tail.pathRemainder) / distance
    tail.pathHeadings[(tail.pathIndex + i) % HISTORY_SIZE] = tail.heading + turn * fraction
  }
  tail.pathIndex = (tail.pathIndex + samples) % HISTORY_SIZE
  tail.pathRemainder += distance - samples * STEP
  tail.heading += turn
  const blend = 1 - Math.exp(-dt / 0.18)
  tail.speed += (Math.max(0, speed) * effort - tail.speed) * blend
  // Speed is measured in sprite units per second, independent of orientation,
  // device pixel ratio, depth, or sprite size. Faster swimming primarily changes
  // beat frequency; amplitude increases modestly and stays bounded.
  const targetFrequency = clamp(0.12 + tail.speed * 0.105, 0.12, 1.9) * individualRate
  tail.frequency += (targetFrequency - tail.frequency) * blend
  const targetAmplitude = (0.15 + 1.7 * tail.speed / (tail.speed + 3.5)) * (0.65 + sway * 0.6)
  tail.amplitude += (targetAmplitude - tail.amplitude) * blend
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
  // Tight turns can bring the tail back alongside the body.
  if (!tail.tightCurve) {
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (tail.x[mid] > u) lo = mid; else hi = mid }
    hi = Math.min(SEGMENTS, lo + 3)
    lo = Math.max(0, lo - 2)
  }
  let best = Infinity, bestIndex = lo, bestT = 0, bestV = 0
  for (let i = lo; i < hi; i++) {
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
