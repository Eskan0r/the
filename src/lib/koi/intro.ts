import { createKoiFish, koiPopulation, type KoiFish } from './fish'
import { createKoiSideView } from './side-view'
import { updateTail } from './tail'

export type KoiIntro = {
  fish: KoiFish; slot: number; host: HTMLElement
  minimumVisible: Promise<void>
  finish: (onReady: (skipMotion: boolean) => void) => void; stop: () => void
}
export let koiIntro: KoiIntro | undefined

export function startKoiIntro() {
  if (koiIntro) return
  const host = document.getElementById('koi-intro')
  host?.dispatchEvent(new Event('koi-start'))
  const canvas = host?.querySelector('canvas')
  const ctx = canvas?.getContext('2d')
  if (!host || !canvas || !ctx) {
    document.documentElement.classList.remove('koi-loading')
    return
  }

  const slot = Math.floor(Math.random() * koiPopulation(innerWidth, innerHeight))
  const fish = createKoiFish(slot, { x: 0, y: 0 })
  const speed = 6.8 * fish.speedMul
  const pixels = ctx.createImageData(canvas.width, canvas.height)
  const framePixels = new Uint32Array(pixels.data.buffer)
  const drawProfile = createKoiSideView(fish, pixels.width, pixels.height)
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  const events = new AbortController()
  const { signal } = events
  let frameId = 0
  let sceneryFrame = 0
  let lastTime = 0
  let readyAt: number | undefined
  let gaze = 0
  let release: ((skipMotion: boolean) => void) | undefined

  // The camera centers the fish. Its position stays in the pond's backing pixels.
  function resize() {
    if (readyAt !== undefined && !release) return
    const dpr = Math.min(devicePixelRatio || 1, 2)
    fish.x = Math.round(innerWidth * dpr) / 2
    fish.y = Math.round(innerHeight * dpr) / 2
  }

  function draw() {
    drawProfile(framePixels, gaze)
    ctx!.putImageData(pixels, 0, 0)
  }

  function frame(now: number) {
    if (readyAt === undefined) {
      const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0
      lastTime = now
      updateTail(fish.tail, dt, fish.heading, speed, 0.5, fish.rateMul)
      draw()
    } else {
      const elapsed = Math.max(0, now - readyAt)
      if (gaze < 1) {
        const t = Math.min(1, elapsed / 165)
        gaze = t * t * (3 - 2 * t)
        draw()
      } else if (elapsed >= 460) {
        transfer(false)
        return
      }
    }
    frameId = requestAnimationFrame(frame)
  }

  function syncMotion() {
    cancelAnimationFrame(frameId)
    lastTime = 0
    if (readyAt !== undefined && !release) return
    const paused = document.hidden || motion.matches
    host!.toggleAttribute('data-paused', paused)
    if (!paused) frameId = requestAnimationFrame(frame)
    else if (readyAt !== undefined) transfer(true)
  }

  function transfer(skipMotion: boolean) {
    const begin = release
    release = undefined
    begin?.(skipMotion)
  }

  function finish(onReady: (skipMotion: boolean) => void) {
    if (readyAt !== undefined || signal.aborted) return
    release = onReady
    readyAt = performance.now()
    host!.setAttribute('data-ready', '')
    syncMotion()
  }

  function stop() {
    if (signal.aborted) return
    events.abort()
    cancelAnimationFrame(frameId)
    cancelAnimationFrame(sceneryFrame)
    host!.remove()
    document.documentElement.classList.remove('koi-loading')
    koiIntro = undefined
  }

  window.addEventListener('resize', resize, { signal })
  window.addEventListener('pagehide', event => { if (!event.persisted) stop() }, { signal })
  window.addEventListener('popstate', () => { if (location.pathname !== '/') stop() }, { signal })
  document.addEventListener('visibilitychange', syncMotion, { signal })
  motion.addEventListener('change', syncMotion, { signal })
  resize()
  updateTail(fish.tail, 0.5, fish.heading, speed, 0.5, fish.rateMul)
  draw()
  koiIntro = { fish, slot, host, finish, stop, minimumVisible: waitForVisibleFish(signal) }
  syncMotion()
  // Give the first fish frame a paint before requesting optional scenery.
  sceneryFrame = requestAnimationFrame(() => {
    sceneryFrame = requestAnimationFrame(() => {
      if (readyAt !== undefined) return
      void import('./intro-scenery').then(({ mountIntroScenery }) => {
        if (!signal.aborted && readyAt === undefined) mountIntroScenery(host)
      }).catch(() => { /* The water gradient remains visible if scenery is unavailable. */ })
    })
  })
}

// Start at the first draw. Hidden time never consumes the visible swim period.
export function waitForVisibleFish(signal: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    let remaining = 2000
    let since: number | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    const done = () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', sync)
      signal.removeEventListener('abort', done)
      resolve()
    }
    function sync() {
      clearTimeout(timer)
      const now = performance.now()
      if (since !== undefined) remaining -= Math.max(0, now - since)
      since = document.hidden ? undefined : now
      if (remaining <= 0) done()
      else if (!document.hidden) timer = setTimeout(sync, Math.ceil(remaining))
    }
    document.addEventListener('visibilitychange', sync)
    signal.addEventListener('abort', done, { once: true })
    sync()
  })
}

export function showLoadError(error: unknown) {
  console.error('Unable to load page', error)
  koiIntro?.stop()
  const message = document.getElementById('load-error')
  if (message) message.hidden = false
}
