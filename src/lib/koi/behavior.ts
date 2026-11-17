// Koi-inspired push/glide locomotion with persistent goals and personal space.
// Biological inspiration and artistic limits are recorded in docs/water-physics.md.
export type KoiBehavior = {
  random: number; goalX: number; goalY: number; goalUntil: number; courseUntil: number; exploring: boolean
  stroke: boolean; gaitUntil: number; effort: number; turnRate: number; speed?: number
}
export type KoiNeighbor = { id: number; x: number; y: number; heading: number; speed: number; radius: number }
type Fish = { x: number; y: number; heading: number; seed: number; behavior: KoiBehavior }
const TAU = Math.PI * 2
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const ease = (t: number) => { const p = clamp(t, 0, 1); return p * p * (3 - 2 * p) }
function random(state: KoiBehavior) {
  state.random = (Math.imul(state.random, 1664525) + 1013904223) >>> 0
  return state.random / 4294967296
}

export function createKoiBehavior(seed: number): KoiBehavior {
  return { random: seed >>> 0, goalX: 0.5, goalY: 0.5, goalUntil: -1, courseUntil: 0, exploring: false,
    stroke: (seed & 1) === 0, gaitUntil: -1, effort: 1, turnRate: 0 }
}

export function chooseKoiSpawn(width: number, height: number, neighbors: { x: number; y: number }[], rng = Math.random) {
  let best = { x: width * 0.53, y: height * 0.5 }, clearance = -1
  for (let i = 0; i < 20; i++) {
    const angle = rng() * TAU, radius = Math.sqrt(rng())
    const candidate = { x: width * (0.52 + Math.cos(angle) * radius * 0.39), y: height * (0.5 + Math.sin(angle) * radius * 0.40) }
    const distance = neighbors.length ? Math.min(...neighbors.map(other => Math.hypot(candidate.x - other.x, candidate.y - other.y))) : rng()
    if (distance > clearance) { best = candidate; clearance = distance }
  }
  return best
}

export function planKoiBehavior(
  fish: Fish, neighbors: KoiNeighbor[], width: number, height: number,
  radius: number, baseSpeed: number, time: number,
) {
  const state = fish.behavior
  const distance = Math.hypot(fish.x - state.goalX * width, fish.y - state.goalY * height)
  if (time >= state.courseUntil && (time >= state.goalUntil || distance < Math.max(radius * 0.65, baseSpeed * 1.3))) {
    // Most destinations occupy an ellipse, not one shared center point.
    // Occasional independent excursions keep the edges part of the habitat.
    state.exploring = random(state) < 0.22
    let best = -Infinity
    for (let candidate = 0; candidate < 10; candidate++) {
      let gx: number, gy: number
      if (state.exploring) {
        const side = Math.floor(random(state) * 4)
        gx = side < 2 ? (side ? 0.91 : 0.09) : 0.12 + random(state) * 0.76
        gy = side >= 2 ? (side === 2 ? 0.09 : 0.91) : 0.12 + random(state) * 0.76
      } else {
        const angle = random(state) * TAU, r = Math.sqrt(random(state))
        gx = 0.52 + Math.cos(angle) * r * 0.34
        gy = 0.5 + Math.sin(angle) * r * 0.35
      }
      const dx = gx * width - fish.x, dy = gy * height - fish.y
      const length = Math.max(1, Math.hypot(dx, dy))
      // Prefer a destination ahead and far enough away for a sustained pass.
      const alignment = (dx * Math.cos(fish.heading) + dy * Math.sin(fish.heading)) / length
      const score = alignment + Math.min(1, length / Math.max(1, baseSpeed * 15)) * 0.3
      if (score > best) { best = score; state.goalX = gx; state.goalY = gy }
    }
    state.goalUntil = time + 25 + random(state) * 20
    state.courseUntil = time + 6 + random(state) * 5
  }
  if (time >= state.gaitUntil) {
    state.stroke = !state.stroke
    state.effort = state.stroke ? 1.18 + random(state) * 0.18 : 0.82 + random(state) * 0.2
    state.gaitUntil = time + (state.stroke ? 0.65 + random(state) * 0.65 : 1.2 + random(state) * 1.8)
  }
  const phase = fish.seed * 0.017
  const meander = Math.sin(time * 0.12 + phase) * 0.055 + Math.sin(time * 0.23 + phase * 1.7) * 0.025
  const desired = Math.atan2(state.goalY * height - fish.y, state.goalX * width - fish.x) + meander
  let x = Math.cos(desired) + Math.cos(fish.heading) * 0.65
  let y = Math.sin(desired) + Math.sin(fish.heading) * 0.65
  const cx = (width * 0.53 - fish.x) / (width * 0.34), cy = (height * 0.5 - fish.y) / (height * 0.36)
  const centerDistance = Math.hypot(cx, cy)
  const home = ease((centerDistance - 0.9) / 0.8) * (state.exploring ? 0.04 : 0.7)
  if (centerDistance > 0) { x += cx / centerDistance * home; y += cy / centerDistance * home }

  let avoidX = 0, avoidY = 0, clearance = 1, avoidUrgency = 0
  const speed = state.speed ?? baseSpeed
  const vx = Math.cos(fish.heading) * speed, vy = Math.sin(fish.heading) * speed
  for (const other of neighbors) {
    if (other.id === fish.seed) continue
    const rx = fish.x - other.x, ry = fish.y - other.y
    const current = Math.hypot(rx, ry)
    const space = (radius + other.radius) * 0.86
    if (current > space + (speed + other.speed) * 3) continue
    const dx = vx - Math.cos(other.heading) * other.speed, dy = vy - Math.sin(other.heading) * other.speed
    const relativeSpeed = dx * dx + dy * dy
    const closestTime = relativeSpeed > 0.01 ? clamp(-(rx * dx + ry * dy) / relativeSpeed, 0, 3) : 0
    const px = rx + dx * closestTime, py = ry + dy * closestTime
    const closest = Math.hypot(px, py)
    const near = 1 - clamp(current / space, 0, 1)
    const predicted = (1 - clamp(closest / (space * 1.2), 0, 1)) * (1 - closestTime / 5)
    const weight = Math.max(near * near * 4.5, predicted * predicted * 3.8)
    if (weight <= 0) continue
    avoidUrgency = Math.max(avoidUrgency, Math.min(1.2, weight / 1.5))
    if (predicted > 0.3 && rx * dx + ry * dy < 0) avoidUrgency = Math.max(avoidUrgency, 1.1)
    let awayX = px, awayY = py, length = closest
    if (length < space * 0.12) {
      // Sidestep an oncoming path instead of braking into the same head-on line.
      if (relativeSpeed > 0.01 && current > space * 0.12) {
        awayX = -dy; awayY = dx; length = Math.sqrt(relativeSpeed)
      } else {
        const angle = (Math.min(fish.seed, other.id) * 0.031) % TAU
        const side = fish.seed < other.id ? 1 : -1
        awayX = Math.cos(angle) * side; awayY = Math.sin(angle) * side; length = 1
      }
    }
    avoidX += awayX / length * weight; avoidY += awayY / length * weight
    const ahead = current > 0 ? -(rx * Math.cos(fish.heading) + ry * Math.sin(fish.heading)) / current : 1
    if (ahead > 0.35) clearance = Math.min(clearance, 1 - Math.max(near, predicted) * 0.72)
  }
  return { x, y, avoidX, avoidY, avoidUrgency, speedFactor: state.effort * clearance, stroke: state.stroke }
}

export function advanceKoiCruise(fish: Fish, aimX: number, aimY: number, targetSpeed: number, baseSpeed: number, dt: number, responsiveness = 1) {
  if (dt <= 0) return 0
  const state = fish.behavior
  const desired = Math.atan2(aimY, aimX)
  const difference = Math.atan2(Math.sin(desired - fish.heading), Math.cos(desired - fish.heading))
  const urgent = Math.max(0, responsiveness - 1)
  const turnLimit = (state.stroke ? 0.45 : 0.3) + urgent * 0.85
  const wantedTurn = urgent === 0 && Math.abs(difference) < 0.1 ? 0
    : clamp(difference * (0.85 + urgent * 0.6), -turnLimit, turnLimit)
  state.turnRate += (wantedTurn - state.turnRate) * (1 - Math.exp(-dt / (urgent > 0 ? 0.4 : 0.65)))
  const turn = state.turnRate * dt
  const turning = 1 - Math.min(0.3, Math.abs(state.turnRate) * 0.18)
  const desiredSpeed = targetSpeed * turning
  state.speed ??= baseSpeed
  const change = clamp((desiredSpeed - state.speed) * (1 - Math.exp(-dt / 0.65)), -baseSpeed * 1.2 * dt, baseSpeed * 1.2 * dt)
  state.speed = Math.max(0, state.speed + change)
  fish.x += Math.cos(fish.heading + turn / 2) * state.speed * dt
  fish.y += Math.sin(fish.heading + turn / 2) * state.speed * dt
  fish.heading += turn
  return state.speed
}
