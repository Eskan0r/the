import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'

const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText
const asModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const optics = await import(asModule(compile(await readFile(new URL('../src/lib/koi/optics.ts', import.meta.url), 'utf8'))))
const source = await readFile(new URL('../src/lib/koi/sunlight.ts', import.meta.url), 'utf8')
const { PondSunlight } = await import(asModule(compile(source.replace("import { CAUSTIC_ATLAS } from './optics'", `const CAUSTIC_ATLAS = ${JSON.stringify(optics.CAUSTIC_ATLAS)}`))))

test('caustic interpolation advances between frames within the former 30 Hz deadband', () => {
  // Supply decoded light maps directly, without browser image loading.
  globalThis.Image = class {}
  const sunlight = new PondSunlight(4, 4, 4)
  const { size, frames } = optics.CAUSTIC_ATLAS
  sunlight.maps = Array.from({ length: frames }, (_, frame) => new Uint8Array(size * size).fill(frame === 0 ? 100 : 180))
  sunlight.update(0.001)
  const before = sunlight.light[0]
  sunlight.update(0.009)
  assert.ok(sunlight.light[0] > before)
  const unchanged = sunlight.light[0]
  sunlight.update(0.009)
  assert.equal(sunlight.light[0], unchanged)
})
