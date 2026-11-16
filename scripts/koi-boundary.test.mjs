import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/koi/boundary.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText
const { pondBoundary } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

test('does not change steering in the centre, at any heading', () => {
  for (const [w, h] of [[1440, 900], [390, 844]]) for (let i = 0; i < 16; i++) {
    assert.deepEqual(pondBoundary(w / 2, h / 2, i * Math.PI / 8, 25, 95, w, h), { x: 0, y: 0 })
  }
})

test('pressure grows smoothly toward and beyond the border', () => {
  let previous = 0
  for (const x of [180, 120, 80, 40, 0, -40, -100]) {
    const force = pondBoundary(x, 450, Math.PI, 25, 95, 1440, 900)
    assert.ok(force.x >= previous); assert.equal(force.y, 0)
    previous = force.x
  }
  assert.ok(previous > 8)
})

test('stays weak all the way to the border and becomes strong only outside', () => {
  for (const heading of [0, Math.PI / 2, Math.PI]) for (const speed of [25, 150]) {
    for (const x of [100, 40, 10, 0]) {
      const force = pondBoundary(x, 450, heading, speed, 95, 1440, 900)
      assert.ok(force.x <= 0.12, 'inside pull stays much weaker than ordinary steering')
    }
    assert.ok(pondBoundary(-40, 450, heading, speed, 95, 1440, 900).x > 1)
  }
})

test('each border and corner pushes toward the pond', () => {
  assert.ok(pondBoundary(0, 450, 0, 25, 95, 1440, 900).x > 0)
  assert.ok(pondBoundary(1440, 450, 0, 25, 95, 1440, 900).x < 0)
  assert.ok(pondBoundary(720, 0, 0, 25, 95, 1440, 900).y > 0)
  assert.ok(pondBoundary(720, 900, 0, 25, 95, 1440, 900).y < 0)
  const corner = pondBoundary(-50, -50, -Math.PI * 0.75, 150, 95, 1440, 900)
  assert.ok(corner.x > 0 && corner.y > 0)
})

test('turns outward-moving fish back naturally on desktop and phone', () => {
  for (const [width, height] of [[1440, 900], [390, 844]]) for (const [x, y, heading] of [
    [-60, height / 2, Math.PI], [width + 60, height / 2, 0],
    [width / 2, -60, -Math.PI / 2], [width / 2, height + 60, Math.PI / 2],
    [-40, -40, -Math.PI * 0.75],
  ]) {
    const fish = { x, y, heading }
    let returned = false
    for (let frame = 0; frame < 60 * 15; frame++) {
      const edge = pondBoundary(fish.x, fish.y, fish.heading, 45, 95, width, height)
      const strength = Math.hypot(edge.x, edge.y)
      const desired = Math.atan2(Math.sin(heading) + edge.y, Math.cos(heading) + edge.x)
      const difference = Math.atan2(Math.sin(desired - fish.heading), Math.cos(desired - fish.heading))
      const turn = 1.1 * (1 + Math.min(1.5, strength * 0.5)) / 60
      fish.heading += Math.max(-turn, Math.min(turn, difference))
      const dx = Math.cos(fish.heading) * 45 / 60, dy = Math.sin(fish.heading) * 45 / 60
      fish.x += dx; fish.y += dy
      assert.ok(Math.hypot(dx, dy) < 1, 'continuous swimming without teleportation')
      if (fish.x > 0 && fish.x < width && fish.y > 0 && fish.y < height) returned = true
    }
    assert.ok(returned, JSON.stringify({ width, height, x, y }))
  }
})
