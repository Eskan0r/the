import assert from 'node:assert/strict'
import { setMaxListeners } from 'node:events'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'

function koiModules(globals = {}, overrides = {}) {
  const context = createContext(globals)
  const cache = new Map()
  function load(name) {
    if (cache.has(name)) return cache.get(name)
    const source = readFileSync(new URL(`../src/lib/koi/${name}.ts`, import.meta.url), 'utf8')
    const js = ts.transpileModule(source, { compilerOptions: {
      target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
    } }).outputText
    const exports = {}
    runInContext('(function(exports, require){' + js + '})', context)(exports, path => overrides[path] ?? load(path.slice(2)))
    cache.set(name, exports)
    return exports
  }
  return load
}

test('the wash animates the intro clip and water together, and both animations cancel cleanly', () => {
  const animations = []
  const animate = (keyframes, timing) => {
    const animation = { keyframes, timing, cancelled: false, cancel() { this.cancelled = true } }
    animations.push(animation)
    return animation
  }
  const water = { setAttribute() {}, style: {}, animate, remove() { this.removed = true } }
  const host = { dataset: {}, style: {}, after(node) { assert.equal(node, water) }, animate }
  const { startWaterWash } = koiModules({ document: { createElementNS: () => water } })('wash')
  let finished = 0
  const stop = startWaterWash(host, () => { finished++ })
  const [clip, sweep] = animations
  assert.equal(clip.timing, sweep.timing)
  assert.ok(clip.keyframes[0].clipPath.startsWith('inset(-'))
  assert.ok(sweep.keyframes[0].transform.startsWith('translateY(-'))
  assert.equal(finished, 0)
  stop()
  assert.equal(sweep.onfinish, null)
  assert.ok(clip.cancelled && sweep.cancelled && water.removed)
  assert.equal(finished, 0)
})

for (const ending of ['complete', 'hidden', 'reduced motion']) test(`the adopted koi retains its pose when the wash ends through ${ending}`, () => {
  const media = Object.assign(new EventTarget(), { matches: false })
  const window = Object.assign(new EventTarget(), { innerWidth: 160, innerHeight: 120, devicePixelRatio: 1,
    matchMedia: () => media })
  const context = new Proxy({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    createRadialGradient: () => ({ addColorStop() {} }) }, { get: (o, k) => o[k] ?? (() => {}) })
  const canvas = () => Object.assign(new EventTarget(), { style: {}, getContext: () => context })
  const document = Object.assign(new EventTarget(), { hidden: false, createElement: canvas })
  const frames = new Map()
  let serial = 0, ready, waveFinished, waveStopped = 0, released = 0, pondDraws = 0
  const seen = new Set(), slots = []
  const overrides = {
    './environment': { createPond: (w, h) => ({ pixels: new Uint32Array(w * h) }) },
    './sunlight': { PondSunlight: class { apply() {} update() {} } },
    './water': { WaterSurface: class { refract() {} release() {} } }, './dock': { drawDock() { pondDraws++ } },
    './wash': { startWaterWash(_host, complete) { waveFinished = complete; return () => { waveStopped++ } } },
  }
  class TestAbortController extends AbortController {
    constructor() { super(); setMaxListeners(24, this.signal) }
  }
  const load = koiModules({ window, document, AbortController: TestAbortController, Image: class {}, performance: { now: () => 100 },
    requestAnimationFrame(fn) { frames.set(++serial, fn); return serial },
    cancelAnimationFrame(id) { frames.delete(id) },
  }, overrides)
  const shared = load('fish')
  const fish = shared.createKoiFish(2, { x: 80, y: 60 }, () => 0.3)
  const tail = fish.tail
  overrides['./fish'] = { ...shared,
    createKoiFish(slot, ...args) { slots.push(slot); return shared.createKoiFish(slot, ...args) },
    sampleKoi(u, v, e, out) { seen.add(e); return shared.sampleKoi(u, v, e, out) },
  }
  const stop = load('scene').startKoi(canvas(), canvas(), {}, {
    fish, slot: 2, finish(begin) { ready = begin }, stop() { released++ },
  })
  assert.deepEqual(slots, [0, 1, 3])
  assert.equal(seen.size, 4)
  assert.ok(seen.has(fish))
  assert.equal(fish.tail, tail)
  const pose = JSON.stringify(tail)
  assert.equal(frames.size, 0)
  ready(false)
  assert.equal(pondDraws, 1)
  assert.equal(frames.size, 0)
  if (ending === 'hidden') {
    document.hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    assert.equal(frames.size, 0)
    document.hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
  } else if (ending === 'reduced motion') {
    media.matches = true
    media.dispatchEvent(new Event('change'))
  } else waveFinished()
  waveFinished()
  assert.equal(waveStopped, 1)
  assert.equal(released, 1)
  assert.equal(frames.size, 1)
  assert.equal(JSON.stringify(tail), pose)
  stop()
  assert.equal(frames.size, 0)
})
