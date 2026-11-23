import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

async function compile(name) {
  const source = await readFile(new URL(`../src/lib/koi/${name}.ts`, import.meta.url), 'utf8')
  return ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
  }).outputText
}

const dataUrl = js => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
const tailUrl = dataUrl(await compile('tail'))
const { updateTail } = await import(tailUrl)
const { createKoiFish, sampleKoi } = await import(dataUrl((await compile('fish')).replace("'./tail'", JSON.stringify(tailUrl))))

test('pond spawn traits and markings match the original sampler across a full palette cycle', () => {
  let seed = 123
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const hash = createHash('sha256')
  const out = { r: 0, g: 0, b: 0, a: 0, shine: 0 }
  for (let slot = 0; slot < 13; slot++) {
    const fish = createKoiFish(slot, { x: 123, y: 456 }, random)
    hash.update(JSON.stringify([fish.x, fish.y, fish.z, fish.seed, fish.pal.base, fish.pal.patch,
      fish.pal.thr, fish.pal.dark, fish.rateMul, fish.speedMul, fish.heading, fish.tail.phase]))

    for (const turning of [false, true]) {
      if (turning) {
        for (let frame = 0; frame < 75; frame++) {
          updateTail(fish.tail, 1 / 60, fish.heading + frame / 60, 5, 0.5, fish.rateMul)
        }
      }
      for (let j = -24; j <= 24; j++) {
        for (let i = -52; i <= 36; i++) {
          const hit = sampleKoi(i / 4, j / 4, fish, out)
          hash.update(hit ? JSON.stringify([out.r, out.g, out.b, out.a, out.shine]) : '.')
        }
      }
    }
  }
  // Captured from scene.ts before extracting its factory and point sampler.
  assert.equal(hash.digest('hex'), 'a23d54fed2dcf46e9a1d74f40eb49a081262f84ddb5c38dafeb69c93e8bdc5cf')
})
