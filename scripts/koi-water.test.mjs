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

test('a long flick applies continuous swept pressure, matching dense spatial quadrature', () => {
  const w = new WaterSurface(1440, 900)
  const x = 700, y = 400, travelX = 1100, travelY = 240, pressure = 20
  w.propagate(x, y, pressure, travelX, travelY)
  // Independently integrate a thousand Gaussian source positions along a flick.
  // Midpoint-only stamping fails this check for the higher spatial frequencies.
  for (const [mx, my] of [[1, 0], [3, 5], [17, 2], [31, 7]]) {
    const kx = 2 * Math.PI * mx / (w.cols * w.dx)
    const ky = 2 * Math.PI * my / (w.rows * w.dy)
    const i = my * w.cols + mx
    let re = 0, im = 0
    for (let j = 0; j < 10000; j++) {
      const t = (j + 0.5) / 10000 - 0.5
      const phase = -kx * ((x + t * travelX) / WATER.pixelsPerMetre + w.cols * w.dx / 4)
        - ky * ((y + t * travelY) / WATER.pixelsPerMetre + w.rows * w.dy / 4)
      re += Math.cos(phase) / 10000; im += Math.sin(phase) / 10000
    }
    const scale = pressure * w.forceVelocity[i] * w.decay[i]
    assert.ok(Math.abs(w.vRe[i] / scale - re) < 1e-6)
    assert.ok(Math.abs(w.vIm[i] / scale - im) < 1e-6)
  }
})

test('a quick out-and-back turn between frames retains both parts of the wake', () => {
  const w = new WaterSurface(700, 400)
  const pointer = { x: 100, y: 200, active: true }
  w.advance(1 / 120, pointer)
  w.queuePointer(100, 200); w.queuePointer(600, 200); w.queuePointer(100, 200)
  w.advance(1 / 60, pointer)
  assert.ok(energy(w) > 0)
  assert.ok(w.heights.every(Number.isFinite))
})

test('leaving before the next frame keeps the final flick and resets reentry history', () => {
  const w = new WaterSurface(700, 400)
  w.advance(1 / 120, { x: 100, y: 200, active: true })
  w.queuePointer(400, 200); w.queuePointer(699, 200); w.finishPointer()
  w.advance(1 / 60, { x: 699, y: 200, active: false })
  assert.ok(energy(w) > 0)
  assert.equal(w.previous, null)
  assert.equal(w.pendingPointer.length, 0)
  assert.equal(w.pressure, 0)
})

test('a single fast flick stays visible across its middle after five-shade pixel rendering', () => {
  for (const [width, height, start, end] of [
    [1440, 550, { x: 100, y: 275 }, { x: 1300, y: 275 }],
    [1440, 900, { x: 200, y: 200 }, { x: 1240, y: 700 }],
    [1440, 900, { x: 1240, y: 700 }, { x: 200, y: 200 }],
  ]) {
    const w = new WaterSurface(width, height), cell = 9
    const cols = Math.ceil(width / cell), rows = Math.ceil(height / cell)
    const pixels = new Uint32Array(cols * rows), scratch = new Uint32Array(pixels.length)
    const flatWater = 0xff302d20
    w.advance(1 / 60, { ...start, active: true })
    w.queuePointer(end.x, end.y)
    w.advance(1 / 60, { ...end, active: true })
    const dx = end.x - start.x, dy = end.y - start.y, length = Math.hypot(dx, dy)
    for (let frame = 1; frame <= 12; frame++) {
      w.advance(1 / 60, { ...end, active: true })
      if (![1, 6, 12].includes(frame)) continue
      pixels.fill(flatWater); w.refract(pixels, scratch, cols, rows, cell)
      const bins = Array(8).fill(0)
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const px = (x + 0.5) * cell - start.x, py = (y + 0.5) * cell - start.y
        const along = (px * dx + py * dy) / (length * length)
        const across = Math.abs(px * dy - py * dx) / length
        if (along < 0.1 || along >= 0.9 || across > 100 || pixels[y * cols + x] === flatWater) continue
        bins[Math.floor((along - 0.1) / 0.1)]++
      }
      assert.ok(bins.every(n => n >= 2), `missing rendered middle at frame ${frame}: ${bins}`)
    }
    // The stroke boost must not be stored as sustained endpoint pressure.
    assert.ok(w.pressure < 1)
  }
})
