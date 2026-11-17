import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/koi/bite.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText
const { beginBite, advanceBite, prepareBite, isFacingPellet } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

for (const fps of [20, 30, 60]) for (const angle of [0, Math.PI / 4, Math.PI, Math.PI * 1.5]) {
  test(`holds short, darts, takes one pellet, and returns at ${fps} fps / heading ${angle}`, () => {
    const fish = { x: 500, y: 500, heading: angle }
    const pellet = { x: 500 + Math.cos(angle) * 12 * 7, y: 500 + Math.sin(angle) * 12 * 7, age: 1, life: 20 }
    const other = { ...pellet }
    assert.ok(beginBite(fish, pellet, 7, 0))
    let captures = 0, maxDistance = 0, fastSpeed = 0
    for (let frame = 1; frame <= fps; frame++) {
      const time = frame / fps
      const result = advanceBite(fish, pellet.eaten ? [other] : [pellet, other], 1 / fps, time)
      if (result.eaten) captures++
      const distance = Math.hypot(fish.x - 500, fish.y - 500)
      maxDistance = Math.max(maxDistance, distance); fastSpeed = Math.max(fastSpeed, result.speed)
      assert.equal(fish.heading, angle)
      if (time < 0.22) { assert.equal(distance, 0); assert.ok(!pellet.eaten) }
    }
    assert.equal(captures, 1); assert.ok(!other.eaten)
    assert.ok(maxDistance > 25, 'visible forward strike')
    assert.ok(fastSpeed > 200, 'strike is visibly quick')
    assert.equal(fish.x, 500); assert.equal(fish.y, 500)
    assert.equal(fish.bite, undefined)
  })
}

test('leaves normal movement alone outside the capture range or with food behind', () => {
  for (const x of [700, 490]) {
    const fish = { x: 500, y: 500, heading: 0 }
    const before = { ...fish }, pellet = { x, y: 500, age: 1, life: 20 }
    assert.equal(beginBite(fish, pellet, 7, 0), false)
    assert.deepEqual(advanceBite(fish, [pellet], 1 / 60, 1), { active: false, speed: 0 })
    assert.deepEqual(fish, before)
  }
})

test('returns smoothly if another fish takes the target during the strike', () => {
  const fish = { x: 500, y: 500, heading: 0 }
  const pellet = { x: 584, y: 500, age: 1, life: 20 }
  beginBite(fish, pellet, 7, 0)
  advanceBite(fish, [pellet], 1 / 60, 0.28)
  const before = fish.x
  pellet.eaten = true
  advanceBite(fish, [], 1 / 60, 0.3)
  assert.equal(fish.x, before, 'no position snap on interruption')
  advanceBite(fish, [], 1 / 60, 0.4)
  assert.ok(fish.x > 500 && fish.x < before)
  advanceBite(fish, [], 1 / 60, 0.6)
  assert.equal(fish.x, 500); assert.equal(fish.bite, undefined)
})

test('holds farther from the pellet, lunges the full gap, and returns to the hold position', () => {
  for (const angle of [0, Math.PI / 4, Math.PI, Math.PI * 1.5]) {
    const unit = 7, fish = { x: 500, y: 500, heading: angle }
    const pellet = { x: 500 + Math.cos(angle) * 15 * unit, y: 500 + Math.sin(angle) * 15 * unit, age: 1, life: 20 }
    assert.ok(beginBite(fish, pellet, unit, 0))
    advanceBite(fish, [pellet], 1 / 60, 0.2)
    assert.equal(fish.x, 500); assert.equal(fish.y, 500)
    const result = advanceBite(fish, [pellet], 1 / 60, 0.34)
    assert.equal(result.eaten, pellet)
    assert.ok(Math.abs(Math.hypot(fish.x - 500, fish.y - 500) - 7 * unit) < 1e-10)
    assert.ok(Math.hypot(fish.x + Math.cos(angle) * 8 * unit - pellet.x, fish.y + Math.sin(angle) * 8 * unit - pellet.y) < 1e-10)
    advanceBite(fish, [pellet], 1 / 60, 0.72)
    assert.equal(fish.x, 500); assert.equal(fish.y, 500)
  }
})

for (const fps of [20, 60, 120]) test(`turns in place before a side or rear pellet can be eaten at ${fps} fps`, () => {
  for (const angle of [Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const fish = { x: 500, y: 500, heading: 0 }
    const pellet = { x: 500 + Math.cos(angle) * 105, y: 500 + Math.sin(angle) * 105, age: 1, life: 20 }
    assert.equal(beginBite(fish, pellet, 7, 0), false)
    let time = 0
    for (let frame = 1; frame <= fps * 4 && !fish.bite; frame++) {
      time = frame / fps
      const heading = fish.heading
      assert.ok(prepareBite(fish, pellet, 7, 1 / fps))
      assert.ok(Math.abs(fish.heading - heading) <= 1.6 / fps + 1e-10)
      assert.equal(fish.x, 500); assert.equal(fish.y, 500)
      assert.ok(!pellet.eaten)
      beginBite(fish, pellet, 7, time)
    }
    assert.ok(fish.bite, 'alignment eventually permits the bite')
    assert.ok(isFacingPellet(fish, pellet))
    let eaten = 0
    for (let frame = 1; frame <= fps; frame++) {
      const result = advanceBite(fish, [pellet], 1 / fps, time + frame / fps)
      if (result.eaten) { assert.ok(isFacingPellet(fish, pellet)); eaten++ }
    }
    assert.equal(eaten, 1)
  }
})

test('a pellet within head reach can be eaten after aligning without translating', () => {
  const fish = { x: 500, y: 500, heading: Math.PI }
  const pellet = { x: 520, y: 500, age: 1, life: 20 }
  for (let frame = 1; frame <= 180 && !fish.bite; frame++) {
    prepareBite(fish, pellet, 7, 1 / 60)
    beginBite(fish, pellet, 7, frame / 60)
    assert.equal(fish.x, 500); assert.equal(fish.y, 500)
  }
  assert.ok(fish.bite)
  const start = fish.bite.started
  for (let frame = 1; frame <= 60; frame++) {
    advanceBite(fish, [pellet], 1 / 60, start + frame / 60)
    assert.equal(fish.x, 500); assert.equal(fish.y, 500)
  }
  assert.ok(pellet.eaten)
})

test('a pellet moving out of the facing direction aborts the strike without eating', () => {
  const fish = { x: 500, y: 500, heading: 0 }
  const pellet = { x: 584, y: 500, age: 1, life: 20 }
  assert.ok(beginBite(fish, pellet, 7, 0))
  advanceBite(fish, [pellet], 1 / 60, 0.28)
  pellet.y += 70
  advanceBite(fish, [pellet], 1 / 60, 0.34)
  assert.ok(!pellet.eaten)
  advanceBite(fish, [pellet], 1 / 60, 0.6)
  assert.equal(fish.bite, undefined)
  assert.equal(fish.x, 500); assert.equal(fish.y, 500)
})
