import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/koi/bite.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText
const { beginBite, advanceBite } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

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
  for (const x of [700, 490, 510]) {
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
