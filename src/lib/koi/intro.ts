import { createKoiFish, koiPopulation, type KoiFish } from './fish'
import { createKoiSideView } from './side-view'
import { updateTail } from './tail'

type KoiIntro = { fish: KoiFish; slot: number; finish: () => void; stop: () => void }
export let koiIntro: KoiIntro | undefined

export function startKoiIntro() {
  if (koiIntro) return
  const host = document.getElementById('koi-intro')
  const canvas = host?.querySelector('canvas')
  const ctx = canvas?.getContext('2d')
  if (!host || !canvas || !ctx) {
    document.documentElement.classList.remove('koi-loading')
    return
  }

  const slot = Math.floor(Math.random() * koiPopulation(innerWidth, innerHeight))
  const fish = createKoiFish(slot, { x: 0, y: 0 })
  const speed = 4.4 * fish.speedMul
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

  // The camera centers the fish. Its position stays in the pond's backing pixels.
  function resize() {
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
        stop()
        return
      }
    }
    frameId = requestAnimationFrame(frame)
  }

  function syncMotion() {
    cancelAnimationFrame(frameId)
    lastTime = 0
    const paused = document.hidden || motion.matches
    host!.toggleAttribute('data-paused', paused)
    if (!paused) frameId = requestAnimationFrame(frame)
    else if (readyAt !== undefined) stop()
  }

  function finish() {
    if (readyAt !== undefined || signal.aborted) return
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

  koiIntro = { fish, slot, finish, stop }
  window.addEventListener('resize', resize, { signal })
  window.addEventListener('pagehide', event => { if (!event.persisted) stop() }, { signal })
  window.addEventListener('popstate', () => { if (location.pathname !== '/') stop() }, { signal })
  document.addEventListener('visibilitychange', syncMotion, { signal })
  motion.addEventListener('change', syncMotion, { signal })
  resize()
  updateTail(fish.tail, 0.5, fish.heading, speed, 0.5, fish.rateMul)
  draw()
  syncMotion()
  // Give the first fish frame a paint before requesting optional scenery.
  sceneryFrame = requestAnimationFrame(() => {
    sceneryFrame = requestAnimationFrame(() => {
      if (readyAt !== undefined) return
      void import('./intro-scenery').then(({ mountIntroScenery }) => {
        if (!signal.aborted && readyAt === undefined) mountIntroScenery(host, signal)
      }).catch(() => { /* The water gradient remains visible if scenery is unavailable. */ })
    })
  })
}

export function showLoadError(error: unknown) {
  console.error('Unable to load page', error)
  koiIntro?.stop()
  const message = document.getElementById('load-error')
  if (message) message.hidden = false
}
