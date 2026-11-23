type Direction = 'down' | 'up' | 'right' | 'left'
const directions: readonly Direction[] = ['down', 'up', 'right', 'left']
const cell = 4
const duration = 960
const teal = 0x00969661, deep = 0x00878451, jade = 0x00adbe80
const glass = 0x00bfd1a0, mint = 0x00c6dfae, foam = 0x00d8f1dc

// One asymmetric front with a breaking shoulder and a shallower trailing bay.
// The clip and raster share the same cross-sections, including on resize.
function waterline(s: number, height: number) {
  const crest = Math.exp(-(((s - 0.36) / (s < 0.36 ? 0.31 : 0.16)) ** 2))
  const bay = Math.exp(-(((s - 0.75) / 0.23) ** 2))
  return Math.round(height * (0.49 + 0.27 * crest - 0.10 * bay) + 1.5 * Math.sin(s * 11))
}

function waveStrip(canvas: HTMLCanvasElement, span: number, shortSide: number) {
  const width = Math.max(1, Math.ceil(span / cell))
  const crestHeight = Math.max(31, Math.min(58, Math.round(shortSide / cell * 0.22) + 13))
  const height = crestHeight + 21
  canvas.width = width; canvas.height = height
  canvas.style.width = width * cell + 'px'; canvas.style.height = height * cell + 'px'
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(width, height)
  const pixels = new Uint32Array(image.data.buffer)
  const knots = Array.from({ length: 29 }, (_, i) => 14 + waterline(i / 28, crestHeight))
  const front = new Float32Array(width)
  for (let x = 0; x < width; x++) {
    const at = Math.min(28, (x + 0.5) * cell / span * 28), i = Math.min(27, Math.floor(at))
    front[x] = knots[i] + (knots[i + 1] - knots[i]) * (at - i)
  }

  function paint(t: number) {
    pixels.fill(0)
    for (let x = 0; x < width; x++) {
      const surge = Math.sin(x * 0.043 - t * 4.2)
      const ripple = Math.sin(x * 0.116 + t * 5 + surge * 1.4)
      const edge = Math.round(front[x] + surge * 0.85 + ripple * 0.42)
      const froth = Math.sin(x * 0.059 - t * 6 + 1.4 * surge) + 0.58 * Math.sin(x * 0.21 - t * 8)
      const wake = Math.sin(x * 0.029 + t * 3.6 + 1.7 * ripple)
      const back = Math.min(edge - 1, 23 + Math.round(4 * surge + 4 * wake))
      const curl = Math.round(8 + 2.4 * ripple + 2.8 * wake)
      const leading = 10 + Math.round(2.6 * surge + 1.6 * ripple)
      const shoulder = Math.round(1.7 * surge + 1.1 * ripple)
      for (let d = -back; d <= leading; d++) {
        let color: number, opacity: number
        if (d < -3) {
          const thickness = 1 + d / back
          color = d < -curl ? teal : jade
          opacity = Math.round(172 * thickness * (2 - thickness))
          // Reflections fold back from the lip in short, uneven fans.
          const fold = d + curl
          if (fold >= 0 && fold < 2 + wake * 2 && froth > 0.06) {
            color = fold === 0 && froth > 0.88 ? mint : glass
            opacity = Math.round(142 + 40 * thickness)
          }
          if (wake > 0.55 && Math.abs(d + back * 0.72 + ripple * 2) < 0.92) {
            color = glass; opacity = 104
          }
        } else if (d <= 2) {
          // This opaque core covers the cutoff under the refracting lip.
          color = d < shoulder ? (surge > 0.25 ? teal : deep) : jade
          opacity = 255
          if (froth > 0.12 && Math.abs(d - shoulder) < 0.9 + froth) color = mint
          if (froth > 0.87 && d >= shoulder && d < shoulder + froth) color = foam
        } else {
          const thickness = (leading - d + 1) / (leading - 2)
          color = ripple > 0.25 ? glass : jade
          opacity = Math.round(165 * thickness * thickness)
          if (ripple > 0.68 && froth > 0.2 && d === leading - 2) { color = mint; opacity = 100 }
        }
        const y = edge + d
        if (y >= 0 && y < height) pixels[y * width + x] = (opacity << 24) | color
      }
      // Broken reflections arrive and dissolve independently of the crest.
      if (froth > 0.7) {
        const y = edge - back - 2 - Math.round(1.5 * ripple)
        if (y >= 0) pixels[y * width + x] = (88 << 24) | mint
      }
      if (ripple > 0.90 && surge > 0) {
        const y = edge + leading + 2
        if (y < height) pixels[y * width + x] = (133 << 24) | foam
      }
    }
    ctx.putImageData(image, 0, 0)
  }
  return { height: height * cell, knots, paint }
}

export function startWaterWash(host: HTMLElement, complete: () => void) {
  const direction = directions[Math.floor(Math.random() * directions.length)]
  const horizontal = direction === 'right' || direction === 'left'
  const water = document.createElement('canvas')
  water.setAttribute('aria-hidden', 'true')
  water.setAttribute('data-water-wash', '')
  host.dataset.wash = ''
  host.dataset.direction = water.dataset.direction = direction
  water.style.cssText = 'position:fixed;left:0;top:0;z-index:2;pointer-events:none;image-rendering:pixelated;transform-origin:0 0;will-change:transform'
  host.after(water)
  host.style.willChange = 'clip-path'
  const timing: KeyframeAnimationOptions = { duration, easing: 'cubic-bezier(.36,.12,.32,.95)', fill: 'both' }
  let clip: Animation, sweep: Animation, paint: (t: number) => void, frameId = 0, lastPaint = 0

  function layout() {
    const elapsed = Number(sweep?.currentTime ?? 0)
    if (sweep) { sweep.onfinish = null; sweep.cancel(); clip.cancel() }
    const w = innerWidth, h = innerHeight
    const span = Math.max(1, horizontal ? h : w), travel = horizontal ? w : h
    const strip = waveStrip(water, span, Math.min(w, h))
    paint = strip.paint
    const point = (across: number, depth: number) => {
      if (direction === 'up') return [w - across, h - depth]
      if (direction === 'right') return [depth, h - across]
      if (direction === 'left') return [w - depth, across]
      return [across, depth]
    }
    const angle = { down: 0, up: 180, right: -90, left: 90 }[direction]
    const transform = (depth: number) => {
      const [x, y] = point(0, depth)
      return 'translate(' + x + 'px,' + y + 'px) rotate(' + angle + 'deg)'
    }
    const boundary = (depth: number) => {
      const points = strip.knots.map((k, i) => point(span * i / (strip.knots.length - 1), depth + k * cell))
      points.push(point(span, travel + strip.height), point(0, travel + strip.height))
      return 'polygon(' + points.map(([x, y]) => x + 'px ' + y + 'px').join(',') + ')'
    }
    clip = host.animate([{ clipPath: boundary(-strip.height) }, { clipPath: boundary(travel) }], timing)
    sweep = water.animate([{ transform: transform(-strip.height) }, { transform: transform(travel) }], timing)
    clip.currentTime = sweep.currentTime = elapsed
    sweep.onfinish = complete
    paint(elapsed / duration)
  }

  function animate(now: number) {
    // The overall sweep stays on the compositor. Roll only the thin pixel lip.
    if (now - lastPaint >= 45) { paint(Number(sweep.currentTime) / duration); lastPaint = now }
    frameId = requestAnimationFrame(animate)
  }
  layout()
  frameId = requestAnimationFrame(animate)
  window.addEventListener('resize', layout)
  return () => {
    window.removeEventListener('resize', layout)
    cancelAnimationFrame(frameId)
    sweep.onfinish = null
    clip.cancel(); sweep.cancel()
    water.remove()
    host.style.willChange = ''
  }
}
