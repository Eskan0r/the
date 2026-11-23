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
const fishUrl = dataUrl((await compile('fish')).replace("'./tail'", JSON.stringify(tailUrl)))
const { createKoiFish, sampleKoi } = await import(fishUrl)
const { createKoiSideView } = await import(dataUrl((await compile('side-view')).replace("'./fish'", JSON.stringify(fishUrl))))

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

test('the side camera shows a stable head and a beating tail in both directions', () => {
  const width = 96, height = 44
  for (const random of [0.1, 0.6]) {
    const fish = createKoiFish(1, { x: 100, y: 200 }, () => random)
    const draw = createKoiSideView(fish, width, height)
    const pixels = new Uint32Array(width * height)
    draw(pixels)
    const first = pixels.slice()
    const facingRight = Math.cos(fish.heading) > 0
    let tailMoved = false
    for (let frame = 0; frame < 90; frame++) {
      updateTail(fish.tail, 1 / 60, fish.heading, 5, 0.5, fish.rateMul)
      draw(pixels)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const p = y * width + x
          const localX = facingRight ? x : width - 1 - x
          if (localX > 74) assert.equal(pixels[p], first[p])
          if (localX < 25 && pixels[p] !== first[p]) tailMoved = true
          if (x === 0 || y === 0 || x === width - 1 || y === height - 1) assert.equal(pixels[p], 0)
        }
      }
    }
    assert.ok(tailMoved)
  }
})

test('a resting koi turns only its pupil toward the viewer, from either swimming direction', () => {
  const width = 96, height = 44
  for (const random of [0.1, 0.6]) {
    const fish = createKoiFish(0, { x: 0, y: 0 }, () => random)
    const draw = createKoiSideView(fish, width, height)
    const forward = new Uint32Array(width * height), outward = new Uint32Array(forward.length)
    draw(forward, 0)
    draw(outward, 1)
    let moved = 0
    const pupils = [[], []]
    for (let p = 0; p < forward.length; p++) {
      const x = Math.cos(fish.heading) > 0 ? p % width : width - 1 - p % width
      if (forward[p] !== outward[p]) {
        assert.ok(x >= 77 && x <= 85 && Math.floor(p / width) >= 16 && Math.floor(p / width) <= 23)
        moved++
      }
      if (x >= 77 && x <= 85) {
        if (forward[p] === 0xff2c2a22) pupils[0].push(x)
        if (outward[p] === 0xff2c2a22) pupils[1].push(x)
      }
    }
    const center = xs => xs.reduce((total, x) => total + x, 0) / xs.length
    assert.ok(moved >= 6)
    assert.ok(center(pupils[0]) > center(pupils[1]) + 1)
    assert.ok(pupils[1].length > pupils[0].length)
  }
})
