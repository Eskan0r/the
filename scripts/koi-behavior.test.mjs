import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
const moduleFrom = async name => {
  const source = await readFile(new URL(`../src/lib/koi/${name}.ts`, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
}
const { createKoiBehavior, chooseKoiSpawn, planKoiBehavior, advanceKoiCruise } = await moduleFrom('behavior')
const { pondBoundary } = await moduleFrom('boundary')
const rngFor = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
const makeFish = (seed, x, y, heading = 0) => ({ seed, x, y, heading, behavior: createKoiBehavior(seed) })

test('small course differences do not interrupt a straight cruise', () => {
  const fish = makeFish(10, 500, 450)
  for (let frame = 0; frame < 120; frame++) advanceKoiCruise(fish, Math.cos(0.06), Math.sin(0.06), 22, 22, 1 / 60)
  assert.equal(fish.heading, 0)
  assert.equal(fish.y, 450)
  assert.ok(fish.x > 540)
})

test('roaming destinations favor the current course rather than an arbitrary reversal', () => {
  for (let seed = 1; seed < 25; seed++) {
    const fish = makeFish(seed, 720, 450, seed * 0.31)
    planKoiBehavior(fish, [], 1440, 900, 70, 22, 0)
    const dx = fish.behavior.goalX * 1440 - fish.x, dy = fish.behavior.goalY * 900 - fish.y
    const alignment = (dx * Math.cos(fish.heading) + dy * Math.sin(fish.heading)) / Math.hypot(dx, dy)
    assert.ok(alignment > 0, `seed ${seed} alignment ${alignment}`)
  }
})

test('smoothly accelerates and turns without snapping at different frame rates', () => {
  for (const fps of [20, 60, 120]) {
    const fish = makeFish(10, 500, 500)
    let speed = 22
    for (let i = 0; i < fps * 3; i++) {
      const before = fish.heading, oldTurn = fish.behavior.turnRate
      const next = advanceKoiCruise(fish, -1, 0, 40, 22, 1 / fps)
      assert.ok(Math.abs(next - speed) <= 22 * 1.2 / fps + 1e-9)
      assert.ok(Math.abs(fish.heading - before) <= 0.45 / fps + 1e-9)
      assert.ok(Math.abs(fish.behavior.turnRate - oldTurn) < 0.12)
      speed = next
    }
    assert.ok(fish.x > 450, 'turn preserves a forward arc rather than reversing instantly')
  }
})

test('head-on neighbors anticipate a crossing and keep physical space', () => {
  const fish = [makeFish(11, 500, 450, 0), makeFish(22, 760, 450, Math.PI)]
  for (const [i, f] of fish.entries()) Object.assign(f.behavior, { goalX: i ? 0.25 : 0.8, goalY: 0.5, goalUntil: 100 })
  let closest = Infinity
  for (let frame = 0; frame < 60 * 20; frame++) {
    const neighbors = fish.map(f => ({ id: f.seed, x: f.x, y: f.y, heading: f.heading, speed: f.behavior.speed ?? 22, radius: 70 }))
    for (const f of fish) {
      const plan = planKoiBehavior(f, neighbors, 1440, 900, 70, 22, frame / 60)
      advanceKoiCruise(f, plan.x + plan.avoidX, plan.y + plan.avoidY, 22 * plan.speedFactor, 22, 1 / 60, 1 + plan.avoidUrgency)
    }
    closest = Math.min(closest, Math.hypot(fish[0].x - fish[1].x, fish[0].y - fish[1].y))
  }
  assert.ok(closest > 60, `closest separation ${closest}`)
})

test('coincident fish choose opposite escape directions without position snapping', () => {
  const first = makeFish(11, 720, 450), second = makeFish(22, 720, 450)
  const neighbors = [first, second].map(f => ({ id: f.seed, x: f.x, y: f.y, heading: f.heading, speed: 0, radius: 70 }))
  const a = planKoiBehavior(first, neighbors, 1440, 900, 70, 22, 0)
  const b = planKoiBehavior(second, neighbors, 1440, 900, 70, 22, 0)
  assert.ok(a.avoidX * b.avoidX + a.avoidY * b.avoidY < 0)
  assert.equal(first.x, 720); assert.equal(second.x, 720)
})

for (const [width, height, count, radius, speed] of [[1440, 900, 12, 75, 22], [390, 844, 4, 42, 11]]) {
  test(`prefer the middle, visit the edges, and avoid crowding over five minutes at ${width}x${height}`, () => {
    const rng = rngFor(13279), fish = []
    for (let i = 0; i < count; i++) {
      const p = chooseKoiSpawn(width, height, fish, rng)
      fish.push(makeFish(100 + i * 779, p.x, p.y, rng() * Math.PI * 2))
    }
    let samples = 0, central = 0, peripheral = 0, overlaps = 0, pairs = 0, straight = 0
    const dt = 1 / 30
    for (let frame = 0; frame < 30 * 300; frame++) {
      const neighbors = fish.map(f => ({ id: f.seed, x: f.x, y: f.y, heading: f.heading, speed: f.behavior.speed ?? speed, radius }))
      for (const f of fish) {
        const plan = planKoiBehavior(f, neighbors, width, height, radius, speed, frame * dt)
        const edge = pondBoundary(f.x, f.y, f.heading, speed, radius, width, height)
        const urgency = Math.max(plan.avoidUrgency, Math.min(1.5, Math.hypot(edge.x, edge.y) * 0.5))
        advanceKoiCruise(f, plan.x + plan.avoidX + edge.x, plan.y + plan.avoidY + edge.y, speed * plan.speedFactor, speed, dt, 1 + urgency)
        assert.ok(Number.isFinite(f.x) && Number.isFinite(f.y))
        if (frame > 900 && frame % 15 === 0) {
          samples++
          if (Math.abs(f.behavior.turnRate) < 0.08) straight++
          if (f.x > width * 0.2 && f.x < width * 0.8 && f.y > height * 0.18 && f.y < height * 0.82) central++
          if (f.x < width * 0.18 || f.x > width * 0.82 || f.y < height * 0.16 || f.y > height * 0.84) peripheral++
        }
      }
      if (frame > 900 && frame % 15 === 0) for (let a = 0; a < count; a++) for (let b = a + 1; b < count; b++) {
        pairs++
        if (Math.hypot(fish[a].x - fish[b].x, fish[a].y - fish[b].y) < radius * 0.75) overlaps++
      }
    }
    console.log(`${width} center ${(central / samples * 100).toFixed(1)}%, peripheral ${(peripheral / samples * 100).toFixed(1)}%, close pairs ${(overlaps / pairs * 100).toFixed(2)}%, straight ${(straight / samples * 100).toFixed(1)}%`)
    assert.ok(central / samples > 0.6, 'a gentle preference for the broad central region remains')
    assert.ok(central / samples < 0.85, 'fish are not confined to the middle')
    assert.ok(peripheral / samples > 0.005, 'the outer pond remains accessible')
    assert.ok(peripheral / samples < 0.35, 'fish do not spend most of their time at the edges')
    assert.ok(overlaps / pairs < 0.03, 'severe center-to-center proximity remains uncommon')
    assert.ok(straight / samples > 0.35, 'fish spend substantial time holding their course')
  })
}
