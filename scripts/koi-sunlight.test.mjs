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
  const { size, frames } = optics.CAUSTIC_ATLAS
  const maps = Array.from({ length: frames }, (_, frame) => new Uint8Array(size * size).fill(frame === 0 ? 100 : 180))
  const sunlight = new PondSunlight(4, 4, 4, maps)
  sunlight.update(0)
  assert.ok(sunlight.light[0] > 8, 'the first pond frame already has the prepared caustic intensity')
  sunlight.update(0.001)
  const before = sunlight.light[0]
  sunlight.update(0.009)
  assert.ok(sunlight.light[0] > before)
  const unchanged = sunlight.light[0]
  sunlight.update(0.009)
  assert.equal(sunlight.light[0], unchanged)
})

test('the atlas waits for decoding and readback, shares pending work, and retries failed loads', async () => {
  const fixture = { ...optics.CAUSTIC_ATLAS, size: 2, columns: 2, frames: 4 }
  const js = compile(source.replace("import { CAUSTIC_ATLAS } from './optics'", `const CAUSTIC_ATLAS = ${JSON.stringify(fixture)}`))
  let decode, fail, readError = true, row
  globalThis.Image = class {
    naturalWidth = 4; naturalHeight = 4
    decode() { return new Promise((resolve, reject) => { decode = resolve; fail = reject }) }
  }
  globalThis.document = { createElement: () => ({ getContext: () => ({
    drawImage(_image, _x, y) { row = y },
    getImageData() {
      if (readError) throw new Error('unreadable atlas')
      return { data: Uint8Array.from({ length: 32 }, (_, i) => 80 + row * 4 + i / 4) }
    },
  }) }) }
  try {
    const { loadAtlas } = await import(asModule(js))
    const first = loadAtlas()
    assert.equal(loadAtlas(), first)
    fail(new Error('decode failed'))
    await assert.rejects(first, /decode failed/)
    const second = loadAtlas()
    decode()
    await assert.rejects(second, /unreadable atlas/)
    readError = false
    const third = loadAtlas()
    let complete = false
    void third.then(() => { complete = true })
    await Promise.resolve()
    assert.equal(complete, false)
    decode()
    assert.deepEqual((await third).map(map => map[0]), [80, 82, 88, 90])
    assert.equal(third, loadAtlas())
  } finally {
    delete globalThis.Image
    delete globalThis.document
  }
})
