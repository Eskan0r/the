// Movement only. Fish geometry, colors, animation, and canvas rendering live
// in scene.ts and do not depend on this steering model.
export type Pellet = { x: number; y: number; age: number; life: number; eaten?: boolean }
export type Swimmer = {
  x: number; y: number; heading: number; vx?: number; vy?: number
  turnRate?: number; meal?: Pellet; coastUntil?: number
}
type Neighbor = { swimmer: Swimmer; radius: number; depth: number; leaving: boolean }
export type MotionOptions = {
  dt: number; time: number; unit: number; baseSpeed: number; sense: number
  wanderHeading: number; canFeed: boolean; neighbors: Neighbor[]; depth: number; radius: number
}
const limit = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const difference = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

export function advanceKoiMotion(fish: Swimmer, food: Pellet[], options: MotionOptions): Pellet | undefined {
  const { dt, time, unit, baseSpeed } = options
  if (fish.vx === undefined || fish.vy === undefined) {
    fish.vx = Math.cos(fish.heading) * baseSpeed
    fish.vy = Math.sin(fish.heading) * baseSpeed
  }
  const coasting = time < (fish.coastUntil || 0)
  let meal = fish.meal
  if (!options.canFeed || coasting || meal?.eaten || (meal && meal.age >= meal.life) || (meal && !food.includes(meal))) meal = undefined
  if (!meal && options.canFeed && !coasting) {
    let nearest = options.sense
    for (const pellet of food) {
      if (pellet.eaten) continue
      const distance = Math.hypot(pellet.x - fish.x, pellet.y - fish.y)
      if (distance < nearest) { nearest = distance; meal = pellet }
    }
  }
  fish.meal = meal
  const nose = 7.2 * unit, biteRadius = 2 * unit + 2
  let desired = coasting ? fish.heading : options.wanderHeading
  let speed = baseSpeed
  if (meal) {
    const dx = meal.x - fish.x, dy = meal.y - fish.y, distance = Math.hypot(dx, dy)
    desired = Math.atan2(dy, dx)
    const mouthX = fish.x + Math.cos(fish.heading) * nose
    const mouthY = fish.y + Math.sin(fish.heading) * nose
    // If a pellet is already beneath the fish, pass over it before lining up
    // another approach. Turning around a point inside the body causes orbiting.
    if (distance < nose * 0.7 && Math.hypot(meal.x - mouthX, meal.y - mouthY) > biteRadius) {
      fish.coastUntil = time + nose * 1.2 / Math.max(1, baseSpeed)
      fish.meal = undefined; meal = undefined; desired = fish.heading
    } else {
      const stoppingDistance = Math.max(0, distance - nose - biteRadius * 0.65)
      speed = limit(Math.sqrt(2 * baseSpeed * 0.65 * stoppingDistance), baseSpeed * 0.16, baseSpeed * 1.65)
    }
  }

  // Separation gently adjusts the approach without overwhelming food seeking.
  let steerX = Math.cos(desired), steerY = Math.sin(desired)
  if (!coasting) for (const neighbor of options.neighbors) {
    if (neighbor.swimmer === fish || neighbor.leaving || Math.abs(neighbor.depth - options.depth) > 0.35) continue
    const dx = fish.x - neighbor.swimmer.x, dy = fish.y - neighbor.swimmer.y
    const distance = Math.hypot(dx, dy), space = (options.radius + neighbor.radius) * 0.55
    if (distance > 0.01 && distance < space) {
      const weight = (1 - distance / space) * (meal ? 0.18 : 0.7)
      steerX += dx / distance * weight; steerY += dy / distance * weight
    }
  }
  desired = Math.atan2(steerY, steerX)
  const currentSpeed = Math.hypot(fish.vx, fish.vy)
  // Faster fish make wider turns. Angular velocity and forward velocity both
  // persist across frames instead of snapping toward the next pellet.
  const turnLimit = 0.55 + 0.35 * (1 - Math.min(1, currentSpeed / Math.max(1, baseSpeed * 1.65)))
  const wantedTurn = limit(difference(desired, fish.heading) * 1.25, -turnLimit, turnLimit)
  fish.turnRate = (fish.turnRate || 0) + (wantedTurn - (fish.turnRate || 0)) * Math.min(1, dt * 3)
  const nextHeading = fish.heading + fish.turnRate * dt
  const goalX = Math.cos(nextHeading) * speed, goalY = Math.sin(nextHeading) * speed
  const acceleration = baseSpeed * 0.65
  const dx = goalX - fish.vx, dy = goalY - fish.vy
  const blend = Math.min(1, acceleration * dt / Math.max(0.001, Math.hypot(dx, dy)))
  fish.vx += dx * blend; fish.vy += dy * blend
  fish.heading = Math.atan2(fish.vy, fish.vx)
  fish.x += fish.vx * dt; fish.y += fish.vy * dt

  if (meal && meal.age > 0.4) {
    const mouthX = fish.x + Math.cos(fish.heading) * nose, mouthY = fish.y + Math.sin(fish.heading) * nose
    if (Math.hypot(meal.x - mouthX, meal.y - mouthY) < biteRadius) {
      meal.eaten = true; fish.meal = undefined; fish.coastUntil = time + 0.8
      return meal
    }
  }
}
