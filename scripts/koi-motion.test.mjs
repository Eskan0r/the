import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/koi/motion.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText
const { advanceKoiMotion } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
function fish() { return { x: 500, y: 500, heading: 0, vx: 22, vy: 0 } }
function options(time) { return { dt: 1 / 60, time, unit: 7, baseSpeed: 22, sense: 600,
  wanderHeading: 0, canFeed: true, neighbors: [], depth: 0.8, radius: 91 } }

for (let i = 0; i < 8; i++) test(`eats a pellet at ${i * 45} degrees without persistent orbiting`, () => {
  const koi = fish(), a = i * Math.PI / 4
  const pellet = { x: 500 + Math.cos(a) * 160, y: 500 + Math.sin(a) * 160, age: 1, life: 40 }
  for (let frame = 0; frame < 60 * 28 && !pellet.eaten; frame++) {
    pellet.age += 1 / 60; advanceKoiMotion(koi, [pellet], options(frame / 60))
  }
  assert.ok(pellet.eaten, `still circling: ${JSON.stringify(koi)}`)
  assert.ok(pellet.age < 29)
})

test('food beneath the body is approached again instead of circled on the spot', () => {
  const koi = fish(), pellet = { x: 505, y: 505, age: 1, life: 40 }
  for (let frame = 0; frame < 60 * 28 && !pellet.eaten; frame++) {
    pellet.age += 1 / 60; advanceKoiMotion(koi, [pellet], options(frame / 60))
  }
  assert.ok(pellet.eaten)
})

test('keeps forward momentum and limits acceleration when food spawns behind', () => {
  const koi = fish(), pellet = { x: 300, y: 500, age: 1, life: 40 }
  const before = { ...koi }
  advanceKoiMotion(koi, [pellet], options(0))
  assert.ok(koi.vx > 21.8)
  assert.ok(Math.hypot(koi.vx - before.vx, koi.vy - before.vy) <= 22 * 0.65 / 60 + 0.001)
  assert.ok(Math.abs(koi.heading) < 0.03)
})

test('keeps its chosen pellet rather than switching to every closer neighbor', () => {
  const koi = fish(), first = { x: 660, y: 500, age: 1, life: 40 }
  advanceKoiMotion(koi, [first], options(0))
  const other = { x: 620, y: 530, age: 1, life: 40 }
  advanceKoiMotion(koi, [first, other], options(1 / 60))
  assert.equal(koi.meal, first)
})

test('brakes before the mouth reaches the food and coasts after eating', () => {
  const koi = fish(), pellet = { x: 600, y: 500, age: 1, life: 40 }
  let minimumSpeed = 22, time = 0
  for (let frame = 0; frame < 60 * 12 && !pellet.eaten; frame++) {
    time = frame / 60; pellet.age += 1 / 60
    advanceKoiMotion(koi, [pellet], options(time))
    minimumSpeed = Math.min(minimumSpeed, Math.hypot(koi.vx, koi.vy))
  }
  assert.ok(pellet.eaten); assert.ok(minimumSpeed < 18)
  assert.ok(koi.coastUntil > time)
  const behind = { x: koi.x - 80, y: koi.y, age: 1, life: 40 }
  const x = koi.x
  advanceKoiMotion(koi, [behind], options(time + 1 / 60))
  assert.equal(koi.meal, undefined); assert.ok(koi.x > x)
})
