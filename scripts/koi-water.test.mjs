import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/koi/water.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText
const { WaterSurface, WATER, angularFrequency } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const idle = { x: 240, y: 180, active: false }
const energy = w => w.heights.reduce((sum, h) => sum + h * h, 0)
const tick = (w, seconds, pointer = idle, hz = 60) => {
  for (let i = 0; i < Math.round(seconds * hz); i++) w.advance(1 / hz, pointer)
}

test('dispersion recovers shallow gravity and deep capillary limits and water minimum phase speed', () => {
  const k = 0.001
  assert.ok(Math.abs(angularFrequency(k) / k / Math.sqrt(WATER.gravity * WATER.depth) - 1) < 1e-6)
  const capillaryK = 1e6
  assert.ok(Math.abs(angularFrequency(capillaryK) / Math.sqrt(WATER.tension / WATER.density * capillaryK ** 3) - 1) < 1e-6)
  const crossover = Math.sqrt(WATER.density * WATER.gravity / WATER.tension)
  assert.ok(Math.abs(angularFrequency(crossover) / crossover - 0.231) < 0.002)
})

test('an untouched pond stays exactly flat; entering or parking a pointer injects no energy', () => {
  const w = new WaterSurface(480, 360)
  tick(w, 0.5)
  tick(w, 0.5, { ...idle, active: true })
  assert.equal(energy(w), 0)
})

test('a single Fourier mode matches the analytical damped oscillator and FFT reconstruction', () => {
  const w = new WaterSurface(480, 360)
  const k = 2 * Math.PI / (w.cols * w.dx)
  const beta = 2 * WATER.viscosity * k * k + 0.45
  const omega = angularFrequency(k), wd = Math.sqrt(omega * omega - beta * beta)
  const amplitude = 0.001, n = w.cols * w.rows
  w.hRe[1] = w.hRe[w.cols - 1] = amplitude * n / 2
  tick(w, 0.5)
  const expected = amplitude * Math.exp(-beta * 0.5) * (Math.cos(wd * 0.5) + beta / wd * Math.sin(wd * 0.5))
  assert.ok(Math.abs(w.heights[0] - expected) < 1e-12)
  assert.ok(Math.abs(w.heights[w.cols / 2] + expected) < 1e-12)
})

test('a centered splash propagates symmetrically, conserves zero mean, and dissipates', () => {
  const w = new WaterSurface(480, 480)
  w.splash(240, 240)
  tick(w, 0.25)
  const early = energy(w)
  assert.ok(early > 0)
  assert.ok(Math.abs(w.sample(200, 240) - w.sample(280, 240)) < 1e-10)
  assert.ok(Math.abs(w.sample(240, 200) - w.sample(240, 280)) < 1e-10)
  const mean = w.heights.reduce((a, b) => a + b, 0) / w.heights.length
  assert.ok(Math.abs(mean) < 1e-14)
  tick(w, 8)
  assert.ok(energy(w) < early * 0.01)
  assert.ok(w.heights.every(Number.isFinite))
})

test('moving pressure produces a trailing wake and the same result at 30, 60, and 120Hz', () => {
  const results = []
  for (const hz of [30, 60, 120]) {
    const w = new WaterSurface(700, 400)
    w.advance(1 / 120, { x: 150, y: 200, active: true })
    for (let i = 1; i <= hz; i++) w.advance(1 / hz, { x: 150 + 350 * i / hz, y: 200, active: true })
    let behind = 0, ahead = 0
    for (let y = 130; y < 270; y += 5) for (let d = 40; d < 180; d += 5) {
      behind += w.sample(500 - d, y) ** 2
      ahead += w.sample(500 + d, y) ** 2
    }
    assert.ok(behind > ahead * 2, `wake should trail: ${behind} vs ${ahead}`)
    results.push(w.heights)
  }
  for (const result of results.slice(1)) {
    const error = result.reduce((a, v, i) => a + (v - results[0][i]) ** 2, 0)
    const reference = results[0].reduce((a, v) => a + v * v, 0)
    assert.ok(Math.sqrt(error / reference) < 0.01)
  }
})

test('releasing the pointer avoids a cross-pond streak on reentry and reduced motion reduces amplitude', () => {
  const normal = new WaterSurface(480, 360), reduced = new WaterSurface(480, 360)
  normal.splash(240, 180); reduced.splash(240, 180)
  normal.advance(1 / 60, idle); reduced.advance(1 / 60, idle, 0.2)
  assert.ok(Math.abs(energy(reduced) / energy(normal) - 0.04) < 1e-9)
  const w = new WaterSurface(480, 360)
  tick(w, 0.1, { x: 10, y: 10, active: true })
  w.release()
  tick(w, 0.1, { x: 450, y: 300, active: true })
  assert.equal(energy(w), 0)
})
