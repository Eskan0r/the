import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/koi/optics.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText
const { refractSunlight, bakeCausticFrame, CAUSTIC_ATLAS } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length

test('flat water obeys Snell law and transmits a downward unit ray', () => {
  const ray = refractSunlight(0, 0)
  const incidentSine = Math.hypot(0.25, 0.34)
  assert.ok(Math.abs(Math.hypot(ray.x, ray.y) * 1.333 - incidentSine) < 1e-12)
  assert.ok(Math.abs(Math.hypot(ray.x, ray.y, ray.z) - 1) < 1e-12)
  assert.ok(ray.z < 0)
})

test('tilted surface normals preserve ray length and bend toward the normal', () => {
  for (const hx of [-0.5, 0, 0.5]) for (const hy of [-0.5, 0, 0.5]) {
    const ray = refractSunlight(hx, hy)
    const length = Math.hypot(hx, hy, 1)
    const incidentCosine = (0.25 * hx + 0.34 * hy + Math.sqrt(1 - 0.25 ** 2 - 0.34 ** 2)) / length
    const transmittedCosine = (ray.x * hx + ray.y * hy - ray.z) / length
    assert.ok(transmittedCosine >= incidentCosine - 1e-12)
    assert.ok(Math.abs(Math.hypot(ray.x, ray.y, ray.z) - 1) < 1e-12)
  }
})

test('a flat surface produces uniform irradiance without caustic seams', () => {
  const flux = bakeCausticFrame(0, 0)
  for (const value of flux) assert.ok(Math.abs(value - 1) < 1e-5)
})

test('focusing redistributes incoming flux without adding light or losing boundary rays', () => {
  for (const time of [0, 0.375, 1.5]) {
    const flux = bakeCausticFrame(time)
    assert.ok(Math.abs(mean(flux) - 1) < 1e-5)
    assert.ok(flux.some(value => value > 2), 'concentrated ray bundles become bright')
    assert.ok(flux.some(value => value < 0.5), 'divergent ray bundles become dim')
    assert.ok(flux.every(value => Number.isFinite(value) && value >= 0))
  }
})

test('the optical bake loops seamlessly in physical time', () => {
  const first = bakeCausticFrame(0), last = bakeCausticFrame(CAUSTIC_ATLAS.seconds)
  for (let i = 0; i < first.length; i++) assert.ok(Math.abs(first[i] - last[i]) < 1e-5)
})
