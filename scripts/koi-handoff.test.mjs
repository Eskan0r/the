import assert from 'node:assert/strict'
import { setMaxListeners } from 'node:events'
import { readFileSync } from 'node:fs'
import { posix } from 'node:path'
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
    runInContext('(function(exports, require){' + js + '})', context)(exports, path => overrides[path] ?? load(posix.join(posix.dirname(name), path)))
    cache.set(name, exports)
    return exports
  }
  return load
}

test('HTML and client navigation start the pond only on the two fish paths', async () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n')
  for (const [url, active] of [
    ['https://ronakchavva.com/', false], ['https://ronakchavva.com/fish', true],
    ['https://ronakchavva.com/fish/?color=red#water', true], ['http://localhost:5173/fish?q=1', true],
    ['https://ronakchavva.com/fishy', false], ['https://ronakchavva.com/fish/unknown', false],
    ['https://ronakchavva.com/Fish', false], ['https://ronakchavva.com/fish//', false],
    ['https://os.ronakchavva.com/fish', false], ['https://ronakchavva.com/archive/original', false],
  ]) {
    const location = new URL(url), classes = new Set(), image = {}, bar = { dataset: {} }
    let host, starts = 0
    const template = { content: { firstElementChild: { cloneNode() {
      return Object.assign(new EventTarget(), { isConnected: true, toggleAttribute() {},
        querySelector: s => s === 'img' ? image : bar, remove() { this.isConnected = false; host = undefined } })
    } } } }
    const document = Object.assign(new EventTarget(), { body: { append: node => { host = node } },
      getElementById: id => id === 'koi-intro-template' ? template : host, documentElement: {
        classList: { add: s => classes.add(s), contains: s => classes.has(s), remove: s => classes.delete(s) } } })
    const window = new EventTarget(), globals = { location, window, document, Event }
    runInContext(inline, createContext(globals))
    assert.equal(classes.has('koi-loading'), active, url)
    assert.equal(!!image.src, active, url)
    const { enterFishRoute } = koiModules(globals, { './intro': { startKoiIntro: () => { starts++ } } })('route')
    const early = host
    await enterFishRoute()
    assert.equal(host, early)
    assert.equal(starts, active ? 1 : 0, url)
    if (active) {
      location.pathname = '/'
      window.dispatchEvent(new Event('popstate'))
      assert.equal(host, undefined)
      assert.equal(classes.size, 0)
      location.pathname = '/fish'
      const reentry = enterFishRoute()
      assert.ok(host && host !== early)
      location.pathname = '/'
      window.dispatchEvent(new Event('popstate'))
      await reentry
      assert.equal(starts, 1, 'a late import reactivated a discarded intro')
    }
  }
})

function loadingIntro(mode = 'right') {
  const width = 96, height = 44
  const image = { width, height, data: new Uint8ClampedArray(width * height * 4) }
  const ctx = { createImageData: () => image, putImageData() {} }
  const canvas = { width, height, style: {}, getContext: () => ctx }
  const style = new Map()
  const bar = { dataset: { mode, progress: '0' }, style: { setProperty: (k, v) => style.set(k, v) } }
  const host = Object.assign(new EventTarget(), { querySelector: s => s === 'canvas' ? canvas : bar,
    setAttribute() {}, toggleAttribute() {}, remove() {} })
  const document = Object.assign(new EventTarget(), { hidden: false, getElementById: () => host,
    documentElement: { classList: { contains: () => true, remove() {} } } })
  const frames = new Map()
  let serial = 0, now = 0, tick
  const intro = koiModules({ window: new EventTarget(), document, AbortController, Event,
    location: { hostname: 'localhost', pathname: '/fish' },
    matchMedia: () => Object.assign(new EventTarget(), { matches: false }),
    innerWidth: 390, innerHeight: 844, devicePixelRatio: 2, performance: { now: () => now },
    setTimeout: fn => { tick = fn; return 1 }, clearTimeout() { tick = undefined },
    requestAnimationFrame(fn) { frames.set(++serial, fn); return serial },
    cancelAnimationFrame(id) { frames.delete(id) },
  }, { './intro-scenery': { mountIntroScenery() {} } })('intro')
  intro.startKoiIntro()
  function advance(ms) {
    now += ms
    tick?.()
    const pending = [...frames.values()]
    frames.clear()
    for (const fn of pending) fn(now)
  }
  return { canvas, image, frames, document, intro: intro.koiIntro, advance, style, bar }
}

test('the loading fish beats its tail while the canvas stays anchored', () => {
  const { canvas, image, frames, intro, advance } = loadingIntro()
  const initial = image.data.slice()
  let moved = false
  for (let i = 0; i < 45; i++) {
    advance(1000 / 60)
    assert.equal(canvas.style.transform, undefined)
    if (!moved) moved = image.data.some((value, n) => value !== initial[n])
  }
  assert.ok(moved)
  intro.stop()
  assert.equal(frames.size, 0)
})

for (const mode of ['right', 'left', 'split-left', 'split-right', 'wide-down', 'wide-up', 'vertical-down', 'vertical-up']) {
  test(`the ${mode} bar reserves completion for the first pond frame`, async () => {
    const { intro, bar, style, advance, document } = loadingIntro(mode)
    const split = mode.startsWith('split')
    function check(expected) {
      assert.equal(Number(bar.dataset.progress), expected)
      assert.equal(style.get('--lead'), (split ? Math.min(50, expected) : expected) + '%')
      assert.equal(style.get('--trail'), split ? Math.max(0, expected - 50) + '%' : undefined)
    }
    check(4)
    intro.markLoaded('app')
    intro.markLoaded('app')
    check(12)
    advance(1000)
    check(39)
    document.hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    intro.markLoaded('sunlight')
    advance(5000)
    check(39)
    document.hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    check(54)
    advance(1000)
    await intro.minimumVisible
    check(81)
    intro.markLoaded('scenery')
    check(96)
    intro.finish(() => {})
    check(100)
    intro.stop()
    advance(5000)
    check(100)
  })
}

test('the minimum counts two seconds of visible fish and disarms on cancellation', async () => {
  const document = Object.assign(new EventTarget(), { hidden: false })
  let now = 0, timer
  const { waitForVisibleFish } = koiModules({ document, performance: { now: () => now },
    setTimeout(fn, delay) { timer = { fn, delay }; return 1 }, clearTimeout() { timer = undefined },
  })('intro')
  let done = false
  const progress = []
  const gate = waitForVisibleFish(new AbortController().signal, value => progress.push(value)).then(() => { done = true })
  assert.equal(timer.delay, 50)
  now = 750
  document.hidden = true; document.dispatchEvent(new Event('visibilitychange'))
  assert.equal(timer, undefined)
  now = 13000
  document.hidden = false; document.dispatchEvent(new Event('visibilitychange'))
  assert.equal(timer.delay, 50)
  assert.deepEqual(progress, [0, 0.375, 0.375])
  now += 1249; timer.fn()
  assert.equal(timer.delay, 1)
  await Promise.resolve()
  assert.equal(done, false)
  now++; timer.fn()
  await gate
  assert.ok(done)
  assert.equal(progress.at(-1), 1)
  assert.equal(timer, undefined)
  const abort = new AbortController(), cancelled = waitForVisibleFish(abort.signal, () => {})
  abort.abort()
  await cancelled
  assert.equal(timer, undefined)
})

for (const [index, direction] of ['down', 'up', 'right', 'left'].entries()) test(`the ${direction} wash registers its clip to the pixel crest and cleans up`, () => {
  const animations = []
  const animate = (keys, timing) => {
    const a = { keys, timing, currentTime: 0, cancel() { this.cancelled = true } }
    animations.push(a); return a
  }
  let rendered
  const ctx = { createImageData: (w,h) => ({ data: new Uint8ClampedArray(w*h*4) }), putImageData(img) { rendered = img } }
  const water = { dataset: {}, setAttribute() {}, style: {}, getContext: () => ctx, animate, remove() { this.removed = true } }
  const host = { dataset: {}, style: {}, after(node) { assert.equal(node, water) }, animate }
  const window = new EventTarget()
  const w = 390, h = 844, horizontal = index >= 2
  const { startWaterWash } = koiModules({
    document: { createElement: () => water }, innerWidth: w, innerHeight: h, window,
    Math: Object.assign(Object.create(Math), { random: () => (index + 0.25) / 4 }),
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  })('wash')
  const stop = startWaterWash(host, () => assert.fail('cancelled wash completed'))
  const [clip, sweep] = animations
  assert.equal(water.dataset.direction, direction)
  assert.equal(water.width, Math.ceil((horizontal ? h : w) / 4))
  assert.equal(clip.timing, sweep.timing)
  const points = clip.keys[0].clipPath.slice(8, -1).split(',').slice(0, -2)
  const alpha = new Uint32Array(rendered.data.buffer)
  for (let i = 0; i < points.length; i++) {
    const [px, py] = points[i].split(' ').map(parseFloat)
    const depth = [py, h - py, px, w - px][index] + water.height * 4
    const col = Math.min(water.width - 1, Math.round(i / (points.length - 1) * water.width))
    assert.equal(alpha[Math.round(depth / 4) * water.width + col] >>> 24, 255)
  }
  const span = horizontal ? h : w
  assert.ok(points.length < span / 4)
  sweep.currentTime = 410
  window.dispatchEvent(new Event('resize'))
  assert.equal(animations[3].currentTime, 410)
  stop()
  assert.equal(animations[3].onfinish, null)
  assert.ok(animations.every(a => a.cancelled) && water.removed)
})

test('the surface caches each floating plant independently and reduces its motion to a still pose', () => {
  let reads = 0
  const document = { createElement() {
    const sources = []
    return { sources, getContext: () => new Proxy({
      drawImage: image => sources.push(image.name),
      createRadialGradient: () => ({ addColorStop() {} }),
      getImageData(_x, _y, w, h) { reads++; return { data: new Uint8ClampedArray(w * h * 4) } },
    }, { get: (o, k) => o[k] ?? (() => {}) }) }
  } }
  const images = new Proxy({}, { get: (_o, name) => ({ name, width: 128, height: 128 }) })
  const pond = koiModules({ document })('environment').createPond(160, 100, { images, masks: images })
  const bakedReads = reads
  function pose(time) {
    const sprites = [], rotations = []
    let petalPixels = 0
    const context = new Proxy({ drawImage: im => sprites.push(im),
      rotate: angle => rotations.push(angle), fillRect() { petalPixels++ },
    }, { get: (o, k) => o[k] ?? (() => {}) })
    pond.drawSurface(context, 4, time)
    return { sprites, rotations, petalPixels }
  }
  const rest = pose(null)
  assert.equal(rest.sprites.length, 12)
  assert.equal(new Set(rest.sprites).size, rest.sprites.length)
  assert.equal(rest.sprites.filter(s => s.sources.length === 2).length, 3)
  for (const { sources } of rest.sprites) {
    assert.match(sources[0], /^(lily-pad|maple-leaf)-/)
    if (sources.length > 1) assert.match(sources[1], /^flower-/)
    assert.ok(sources.length <= 2)
  }
  assert.deepEqual(rest.rotations, [])
  assert.equal(rest.petalPixels, 0)
  const quiet = pose(2), visit = pose(10)
  assert.equal(quiet.petalPixels, 0)
  assert.equal(quiet.rotations.length, 8)
  assert.ok(quiet.rotations.every(a => Math.abs(a) < 0.04))
  assert.ok(visit.petalPixels > 0)
  assert.equal(pose(20).petalPixels, 0)
  assert.deepEqual(visit.sprites, rest.sprites)
  assert.notDeepEqual(quiet.rotations, pose(3).rotations)
  assert.equal(reads, bakedReads)
})

for (const ending of ['complete', 'hidden', 'reduced motion']) test(`the live pond swims under the wash and keeps one frame loop on ${ending}`, async () => {
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
    './environment': { createPond: (w, h) => ({ pixels: new Uint32Array(w * h), drawSurface() {} }) },
    './sunlight': { PondSunlight: class { apply() {} update() {} } },
    './water': { WaterSurface: class { advance() {} refract() {} release() {} } }, './dock': { drawDock() { pondDraws++ } },
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
  let minimumReached
  const minimumVisible = new Promise(resolve => { minimumReached = resolve })
  const stop = load('scene').startKoi(canvas(), canvas(), {}, [], {
    fish, slot: 2, minimumVisible, finish(begin) { ready = begin }, stop() { released++ },
  })
  assert.deepEqual(slots, [0, 1, 3])
  assert.equal(pondDraws, 0)
  assert.equal(ready, undefined)
  minimumReached()
  await minimumVisible
  assert.equal(seen.size, 4)
  assert.ok(seen.has(fish))
  assert.equal(fish.tail, tail)
  const pose = JSON.stringify(tail)
  assert.equal(frames.size, 0)
  ready(false)
  assert.equal(pondDraws, 1)
  assert.equal(frames.size, 1)
  const [id, run] = frames.entries().next().value
  frames.delete(id); run(116)
  assert.equal(pondDraws, 2)
  assert.notEqual(JSON.stringify(tail), pose)
  const swimmingPose = JSON.stringify(tail)
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
  assert.equal(JSON.stringify(tail), swimmingPose)
  stop()
  assert.equal(frames.size, 0)
})
