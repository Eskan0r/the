import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/koi/cursor.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText
const { createCursorCarry, advanceCursor, releaseCursor, movePondPointer } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const pointer = { x: 300, y: 300, active: true }
const first = {}, second = {}
const guests = [{ fish: first, x: 340, y: 300 }, { fish: second, x: 360, y: 300 }]

test('only nearby fish may notice an idle cursor, after a delay and a chance', () => {
  const state = createCursorCarry()
  advanceCursor(state, 2, pointer, guests, 1, () => 0)
  assert.equal(state.interested, null)
  advanceCursor(state, 1, pointer, guests, 1, () => 1)
  assert.equal(state.interested, null)
  advanceCursor(state, 0.1, pointer, [{ fish: first, x: 1000, y: 1000 }], 1, () => 0)
  assert.equal(state.interested, null)
  advanceCursor(state, 0.1, pointer, guests, 1, () => 0)
  assert.equal(state.interested, first)
})

test('one fish owns the cursor until release, even if another fish is closer', () => {
  const state = createCursorCarry()
  advanceCursor(state, 3, pointer, guests, 1, () => 0)
  advanceCursor(state, 0.1, pointer, [{ fish: first, x: 305, y: 300 }, { fish: second, x: 300, y: 300 }], 1, () => 0)
  assert.equal(state.carrier, first); assert.equal(state.interested, null)
  advanceCursor(state, 1, pointer, guests, 1, () => 0.9)
  assert.equal(state.carrier, first)
  releaseCursor(state)
  assert.equal(state.carrier, null); assert.equal(state.idle, 0)
  advanceCursor(state, 1, pointer, guests, 1, () => 0)
  assert.equal(state.interested, null)
})

test('cancels on leaving the page, losing the fish, or an unsuccessful approach', () => {
  for (const reason of ['leave', 'missing', 'timeout']) {
    const state = createCursorCarry()
    advanceCursor(state, 3, pointer, guests, 1, () => 0)
    advanceCursor(state, reason === 'timeout' ? 15 : 0.1,
      { ...pointer, active: reason !== 'leave' }, reason === 'missing' ? [] : guests, 1, () => 0)
    assert.deepEqual(state, createCursorCarry())
  }
})

test('pickup distance scales with display density', () => {
  const state = createCursorCarry()
  const guest = { fish: first, x: 325, y: 300 }
  advanceCursor(state, 3, pointer, [guest], 2, () => 0)
  advanceCursor(state, 0.1, pointer, [guest], 2, () => 0)
  assert.equal(state.carrier, first)
})

test('fish notice an idle cursor from farther away at either display density', () => {
  for (const dpr of [1, 2]) {
    const state = createCursorCarry()
    const pointer = { x: 300 * dpr, y: 300 * dpr, active: true }
    const guest = { fish: first, x: 500 * dpr, y: 300 * dpr }
    advanceCursor(state, 3, pointer, [guest], dpr, () => 0)
    assert.equal(state.interested, first)
    advanceCursor(state, 9, pointer, [guest], dpr, () => 0)
    assert.equal(state.interested, first, 'a longer approach is allowed')
    const outside = createCursorCarry()
    advanceCursor(outside, 3, pointer, [{ ...guest, x: 530 * dpr }], dpr, () => 0)
    assert.equal(outside.interested, null)
  }
})

test('mouse control resumes from the mouth and preserves the offset on subsequent moves', () => {
  for (const dpr of [1, 2]) {
    const pointer = { x: 300 * dpr, y: 300 * dpr, active: true, virtual: false, physicalX: 300 * dpr, physicalY: 300 * dpr }
    movePondPointer(pointer, 308 * dpr, 304 * dpr, 1440 * dpr, 900 * dpr, { x: 700 * dpr, y: 450 * dpr })
    assert.equal(pointer.x, 708 * dpr); assert.equal(pointer.y, 454 * dpr)
    assert.ok(pointer.virtual)
    movePondPointer(pointer, 310 * dpr, 301 * dpr, 1440 * dpr, 900 * dpr)
    assert.equal(pointer.x, 710 * dpr); assert.equal(pointer.y, 451 * dpr)
    movePondPointer(pointer, 310 * dpr, 301 * dpr, 1440 * dpr, 900 * dpr)
    assert.equal(pointer.x, 710 * dpr, 'zero delta does not snap back')
  }
})

test('normal mouse position remains absolute before pickup and virtual position stays inside the pond', () => {
  const pointer = { x: 0, y: 0, active: false, virtual: false }
  movePondPointer(pointer, 100, 200, 1440, 900)
  assert.equal(pointer.x, 100); assert.equal(pointer.y, 200)
  movePondPointer(pointer, 120, 220, 1440, 900, { x: 1430, y: 895 })
  assert.equal(pointer.x, 1439); assert.equal(pointer.y, 899)
  movePondPointer(pointer, 110, 210, 1440, 900)
  assert.equal(pointer.x, 1429); assert.equal(pointer.y, 889)
})
