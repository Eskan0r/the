// Local capture animation only. Cruising and food-seeking remain in scene.ts.
type Pellet = { x: number; y: number; age: number; life: number; eaten?: boolean }
type Bite = {
  pellet: Pellet; started: number; x: number; y: number; heading: number
  dx: number; dy: number; swallowed: boolean
  abort?: { started: number; x: number; y: number }
}
type Fish = { x: number; y: number; heading: number; nextBite?: number; bite?: Bite }
const smooth = (t: number) => {
  const p = Math.max(0, Math.min(1, t))
  return p * p * (3 - 2 * p)
}

export function beginBite(fish: Fish, pellet: Pellet, unit: number, time: number): boolean {
  if (fish.bite || pellet.eaten || pellet.age < 0.4 || pellet.age >= pellet.life || time < (fish.nextBite || 0)) return false
  const cs = Math.cos(fish.heading), sn = Math.sin(fish.heading)
  const dx = pellet.x - fish.x - cs * 8 * unit
  const dy = pellet.y - fish.y - sn * 8 * unit
  const gap = Math.hypot(dx, dy)
  // Intercept in front of the mouth, several visible cells short of the food.
  // Targets behind/under the body still use the original approach steering.
  if (gap > 5 * unit || gap < 0.1 * unit || (dx * cs + dy * sn) / gap < 0.45) return false
  fish.bite = { pellet, started: time, x: fish.x, y: fish.y,
    heading: fish.heading, dx, dy, swallowed: false }
  return true
}

export function advanceBite(fish: Fish, food: Pellet[], dt: number, time: number): { active: boolean; speed: number; eaten?: Pellet } {
  const bite = fish.bite
  if (!bite) return { active: false, speed: 0 }
  const oldX = fish.x, oldY = fish.y
  const elapsed = time - bite.started
  fish.heading = bite.heading
  if (!bite.swallowed && !bite.abort && (bite.pellet.eaten || bite.pellet.age >= bite.pellet.life || !food.includes(bite.pellet))) {
    bite.abort = { started: time, x: fish.x, y: fish.y }
  }
  let eaten: Pellet | undefined
  let finished = false
  if (bite.abort) {
    const p = smooth((time - bite.abort.started) / 0.2)
    fish.x = bite.abort.x + (bite.x - bite.abort.x) * p
    fish.y = bite.abort.y + (bite.y - bite.abort.y) * p
    finished = p >= 1
  } else {
    // Hold short for 220 ms, dart in over 120 ms, then back out over 260 ms.
    let distance = 0
    if (elapsed >= 0.22 && elapsed < 0.34) distance = smooth((elapsed - 0.22) / 0.12)
    else if (elapsed >= 0.34 && elapsed < 0.6) distance = 1 - smooth((elapsed - 0.34) / 0.26)
    if (elapsed >= 0.34 && !bite.swallowed) {
      bite.swallowed = true; bite.pellet.eaten = true; eaten = bite.pellet
    }
    fish.x = bite.x + bite.dx * distance
    fish.y = bite.y + bite.dy * distance
    finished = elapsed >= 0.72
  }
  if (finished) {
    fish.x = bite.x; fish.y = bite.y
    fish.bite = undefined
    fish.nextBite = time + 0.12
  }
  return { active: true, speed: Math.hypot(fish.x - oldX, fish.y - oldY) / Math.max(dt, 0.001), eaten }
}
