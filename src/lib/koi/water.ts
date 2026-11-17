// Linear, finite-depth gravity–capillary waves driven by a moving Gaussian
// pressure footprint. SI units throughout; see docs/water-physics.md.
const TAU = Math.PI * 2
export const WATER = { gravity: 9.81, tension: 0.0728, density: 998.2, viscosity: 1.004e-6, depth: 0.35, pixelsPerMetre: 700 }
export function angularFrequency(k: number, depth = WATER.depth) {
  return Math.sqrt((WATER.gravity * k + WATER.tension / WATER.density * k ** 3) * Math.tanh(k * depth))
}

// In-place radix-2 FFT; rows and columns share precomputed twiddles.
class FourierAxis {
  readonly reverse: Uint16Array
  readonly cos: Float64Array
  readonly sin: Float64Array
  constructor(readonly size: number) {
    this.reverse = new Uint16Array(size)
    this.cos = new Float64Array(size / 2)
    this.sin = new Float64Array(size / 2)
    const bits = Math.log2(size)
    for (let i = 0; i < size; i++) {
      let r = 0, v = i
      for (let b = 0; b < bits; b++) { r = (r << 1) | (v & 1); v >>>= 1 }
      this.reverse[i] = r
    }
    for (let i = 0; i < size / 2; i++) {
      this.cos[i] = Math.cos(TAU * i / size)
      this.sin[i] = Math.sin(TAU * i / size)
    }
  }
  inverse(re: Float64Array, im: Float64Array, offset: number, stride: number) {
    const n = this.size
    for (let i = 0; i < n; i++) {
      const j = this.reverse[i]
      if (j <= i) continue
      const a = offset + i * stride, b = offset + j * stride
      const real = re[a], imaginary = im[a]
      re[a] = re[b]; re[b] = real
      im[a] = im[b]; im[b] = imaginary
    }
    for (let len = 2; len <= n; len *= 2) {
      const half = len / 2, jump = n / len
      for (let base = 0; base < n; base += len) for (let j = 0; j < half; j++) {
        const a = offset + (base + j) * stride, b = a + half * stride
        const c = this.cos[j * jump], s = this.sin[j * jump]
        const r = re[b] * c - im[b] * s, v = re[b] * s + im[b] * c
        re[b] = re[a] - r; im[b] = im[a] - v
        re[a] += r; im[a] += v
      }
    }
  }
}

const gridSize = (pixels: number) => Math.max(32, Math.min(256, 2 ** Math.ceil(Math.log2(pixels * 2 / 9))))
const STEP = 1 / 120

export class WaterSurface {
  readonly cols: number
  readonly rows: number
  readonly heights: Float64Array
  readonly dx: number
  readonly dy: number
  private readonly footprintPixels: number
  private readonly xFFT: FourierAxis
  private readonly yFFT: FourierAxis
  private readonly hRe: Float64Array
  private readonly hIm: Float64Array
  private readonly vRe: Float64Array
  private readonly vIm: Float64Array
  private readonly workIm: Float64Array
  private readonly cosine: Float64Array
  private readonly velocityCosine: Float64Array
  private readonly sineOverW: Float64Array
  private readonly wSine: Float64Array
  private readonly forceHeight: Float64Array
  private readonly forceVelocity: Float64Array
  private readonly decay: Float64Array
  private readonly phaseX: Float64Array
  private readonly phaseY: Float64Array
  private readonly sweepX: Float64Array
  private readonly sweepY: Float64Array
  private readonly sweepPhaseX: Float64Array
  private readonly sweepPhaseY: Float64Array
  private remainder = 0
  private previous: { x: number; y: number } | null = null
  private pressure = 0
  private pendingPointer: { x: number; y: number }[] = []
  private pointerEnded = false
  private impulse: { x: number; y: number; strength: number } | null = null

  constructor(readonly width: number, readonly height: number) {
    this.cols = gridSize(width); this.rows = gridSize(height)
    this.dx = 2 * width / WATER.pixelsPerMetre / this.cols
    this.dy = 2 * height / WATER.pixelsPerMetre / this.rows
    this.xFFT = new FourierAxis(this.cols); this.yFFT = new FourierAxis(this.rows)
    const n = this.cols * this.rows
    this.heights = new Float64Array(n); this.workIm = new Float64Array(n)
    this.hRe = new Float64Array(n); this.hIm = new Float64Array(n)
    this.vRe = new Float64Array(n); this.vIm = new Float64Array(n)
    this.cosine = new Float64Array(n); this.velocityCosine = new Float64Array(n); this.sineOverW = new Float64Array(n)
    this.wSine = new Float64Array(n); this.decay = new Float64Array(n)
    this.forceHeight = new Float64Array(n); this.forceVelocity = new Float64Array(n)
    this.phaseX = new Float64Array(this.cols * 2); this.phaseY = new Float64Array(this.rows * 2)
    this.sweepX = new Float64Array(this.cols); this.sweepY = new Float64Array(this.rows)
    this.sweepPhaseX = new Float64Array(this.cols * 2); this.sweepPhaseY = new Float64Array(this.rows * 2)
    // Resolve the pressure footprint instead of aliasing a point force.
    const radius = Math.max(0.012, this.dx * 1.05, this.dy * 1.05)
    this.footprintPixels = 2 * radius * WATER.pixelsPerMetre
    const normalise = n * TAU * radius * radius / (this.cols * this.dx * this.rows * this.dy)
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      const i = y * this.cols + x
      const kx = this.waveNumber(x, this.cols, this.dx), ky = this.waveNumber(y, this.rows, this.dy)
      const k = Math.hypot(kx, ky), w = angularFrequency(k)
      // Bulk viscous attenuation plus a declared phenomenological pond loss.
      const beta = 2 * WATER.viscosity * k * k + 0.45
      const wd = Math.sqrt(Math.max(0, w * w - beta * beta))
      const sw = wd ? Math.sin(wd * STEP) / wd : STEP
      this.cosine[i] = Math.cos(wd * STEP) + beta * sw
      this.velocityCosine[i] = Math.cos(wd * STEP) - beta * sw
      this.sineOverW[i] = sw
      this.wSine[i] = w * w * sw
      this.decay[i] = Math.exp(-beta * STEP)
      const pressureMode = normalise * Math.exp(-0.5 * radius * radius * k * k)
      const acceleration = -k * Math.tanh(k * WATER.depth) / WATER.density * pressureMode
      const valid = x !== this.cols / 2 && y !== this.rows / 2 && w > 0
      this.forceHeight[i] = valid ? acceleration * (1 / this.decay[i] - this.cosine[i]) / (w * w) : 0
      this.forceVelocity[i] = valid ? acceleration * this.sineOverW[i] : 0
    }
  }

  private waveNumber(i: number, n: number, spacing: number) {
    return TAU * (i < n / 2 ? i : i - n) / (n * spacing)
  }

  // Reset the input history on leave/blur/resize, without deleting existing waves.
  release() { this.previous = null; this.pressure = 0; this.pendingPointer.length = 0; this.pointerEnded = false }
  queuePointer(x: number, y: number) {
    if (this.pointerEnded) this.release()
    const last = this.pendingPointer[this.pendingPointer.length - 1]
    if (last?.x === x && last?.y === y) return
    // Bound work even with a high-polling-rate mouse or a stalled browser tab.
    if (this.pendingPointer.length >= 256) this.pendingPointer[this.pendingPointer.length - 1] = { x, y }
    else this.pendingPointer.push({ x, y })
  }
  // Let the next animation frame consume the final movement before releasing.
  finishPointer() { this.pointerEnded = true }
  splash(x: number, y: number, strength = 1) {
    this.impulse = { x, y, strength: Math.max(0, Math.min(2, strength)) }
  }

  advance(dt: number, pointer: { x: number; y: number; active: boolean }, intensity = 1) {
    this.remainder += Math.max(0, Math.min(dt, 0.05))
    const steps = Math.floor((this.remainder + 1e-9) / STEP)
    if (!steps) return
    this.remainder -= steps * STEP
    const queued = this.pendingPointer
    const active = pointer.active || queued.length > 0
    const previous = this.previous || queued[0] || pointer
    const path = [previous, ...queued]
    if (pointer.active && !this.pointerEnded) path.push(pointer)
    const lengths = [0]
    let distance = 0
    for (let i = 1; i < path.length; i++) {
      distance += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y)
      lengths.push(distance)
    }
    const speed = distance / (steps * STEP * WATER.pixelsPerMetre)
    const target = active ? 26 * Math.min(speed / 0.65, 1) * intensity : 0
    const splash = this.impulse
    let segment = 1, from = previous
    const atDistance = (d: number) => {
      while (segment < path.length - 1 && lengths[segment] < d) segment++
      const a = path[segment - 1], b = path[segment] || a
      const span = (lengths[segment] || 0) - lengths[segment - 1]
      const t = span > 0 ? Math.max(0, Math.min(1, (d - lengths[segment - 1]) / span)) : 0
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    }
    for (let s = 0; s < steps; s++) {
      const to = atDistance(distance * (s + 1) / steps)
      this.pressure += (target - this.pressure) * (1 - Math.exp(-STEP / 0.045))
      const x = splash && s === 0 ? splash.x : (from.x + to.x) / 2
      const y = splash && s === 0 ? splash.y : (from.y + to.y) / 2
      // A time-averaged source gets weaker per pixel as travel grows. Once
      // spread over a flick, it can fall entirely below the pixel palette's
      // first shade. Keep impulse per footprint of travel instead, so the
      // middle of a fast stroke remains visible. Do not retain this boost in
      // `this.pressure`, which would leave an oversized splash at the endpoint.
      const coverage = Math.max(1, Math.hypot(to.x - from.x, to.y - from.y) / this.footprintPixels)
      // A flick can start and finish before the 45 ms input easing catches up.
      // Use its measured movement strength along the sweep, while easing the
      // ordinary local footprint as before.
      const sweptPressure = this.pressure + (target - this.pressure) * Math.min(1, coverage - 1)
      // Retain a short visible impulse at each crossed footprint even when its
      // real dwell time is far shorter than a display frame. This is input
      // tuning for the coarse palette, not a change to wave propagation.
      const flickImpulse = 1 + 3 * Math.min(1, coverage - 1)
      const pressure = splash && s === 0 ? 260 * splash.strength * intensity : sweptPressure * coverage * flickImpulse
      // Integrate the footprint along the whole travelled segment, including
      // flicks spanning many cells within one fixed step. Cost stays bounded.
      const sweeping = !(splash && s === 0) && distance > 0
      this.propagate(x, y, pressure,
        sweeping ? to.x - from.x : 0,
        sweeping ? to.y - from.y : 0)
      from = to
    }
    this.impulse = null
    this.previous = pointer.active && !this.pointerEnded ? { x: pointer.x, y: pointer.y } : null
    queued.length = 0
    if (this.pointerEnded) { this.pointerEnded = false; this.pressure = 0 }
    this.heights.set(this.hRe); this.workIm.set(this.hIm)
    for (let y = 0; y < this.rows; y++) this.xFFT.inverse(this.heights, this.workIm, y * this.cols, 1)
    for (let x = 0; x < this.cols; x++) this.yFFT.inverse(this.heights, this.workIm, x, this.cols)
    const n = this.heights.length
    for (let i = 0; i < n; i++) this.heights[i] /= n
  }

  private propagate(x: number, y: number, pressure: number, travelX = 0, travelY = 0) {
    const sweep = Math.hypot(travelX, travelY) > 1
    if (pressure > 1e-8) {
      const mx = x / WATER.pixelsPerMetre + this.cols * this.dx / 4
      const my = y / WATER.pixelsPerMetre + this.rows * this.dy / 4
      for (let i = 0; i < this.cols; i++) {
        const a = -this.waveNumber(i, this.cols, this.dx) * mx
        this.phaseX[i * 2] = Math.cos(a); this.phaseX[i * 2 + 1] = Math.sin(a)
        if (sweep) {
          const angle = this.waveNumber(i, this.cols, this.dx) * travelX / (2 * WATER.pixelsPerMetre)
          this.sweepX[i] = angle
          this.sweepPhaseX[i * 2] = Math.sin(angle); this.sweepPhaseX[i * 2 + 1] = Math.cos(angle)
        }
      }
      for (let i = 0; i < this.rows; i++) {
        const a = -this.waveNumber(i, this.rows, this.dy) * my
        this.phaseY[i * 2] = Math.cos(a); this.phaseY[i * 2 + 1] = Math.sin(a)
        if (sweep) {
          const angle = this.waveNumber(i, this.rows, this.dy) * travelY / (2 * WATER.pixelsPerMetre)
          this.sweepY[i] = angle
          this.sweepPhaseY[i * 2] = Math.sin(angle); this.sweepPhaseY[i * 2 + 1] = Math.cos(angle)
        }
      }
    }
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      const i = y * this.cols + x
      // Fourier transform of a uniformly swept Gaussian: midpoint phase times
      // sinc(k dot travel / 2). This deposits a continuous line, not two stamps.
      const a = sweep ? this.sweepX[x] + this.sweepY[y] : 0
      // sin(a+b) from cached axis phases avoids a transcendental per mode.
      const sine = sweep ? this.sweepPhaseX[x * 2] * this.sweepPhaseY[y * 2 + 1]
        + this.sweepPhaseX[x * 2 + 1] * this.sweepPhaseY[y * 2] : 0
      const p = pressure * (Math.abs(a) > 1e-6 ? sine / a : 1)
      const pr = p * (this.phaseX[x * 2] * this.phaseY[y * 2] - this.phaseX[x * 2 + 1] * this.phaseY[y * 2 + 1])
      const pi = p * (this.phaseX[x * 2] * this.phaseY[y * 2 + 1] + this.phaseX[x * 2 + 1] * this.phaseY[y * 2])
      const hr = this.hRe[i], hi = this.hIm[i], vr = this.vRe[i], vi = this.vIm[i]
      const c = this.cosine[i], sw = this.sineOverW[i], ws = this.wSine[i], d = this.decay[i]
      this.hRe[i] = (hr * c + vr * sw + pr * this.forceHeight[i]) * d
      this.hIm[i] = (hi * c + vi * sw + pi * this.forceHeight[i]) * d
      this.vRe[i] = (vr * this.velocityCosine[i] - hr * ws + pr * this.forceVelocity[i]) * d
      this.vIm[i] = (vi * this.velocityCosine[i] - hi * ws + pi * this.forceVelocity[i]) * d
    }
  }

  sample(x: number, y: number) {
    const gx = Math.max(1, Math.min(this.cols - 2, this.cols / 4 + x / this.width * this.cols / 2))
    const gy = Math.max(1, Math.min(this.rows - 2, this.rows / 4 + y / this.height * this.rows / 2))
    const ix = Math.floor(gx), iy = Math.floor(gy), tx = gx - ix, ty = gy - iy
    const i = iy * this.cols + ix, h = this.heights
    return (h[i] * (1 - tx) + h[i + 1] * tx) * (1 - ty)
      + (h[i + this.cols] * (1 - tx) + h[i + this.cols + 1] * tx) * ty
  }

  // Refract submerged fish/bed, then light the surface using its normal.
  // Wake shading uses 2x2 pond-square blocks; fish retain their original pixels.
  // Floating food and leaves are drawn afterwards by the scene.
  refract(pixels: Uint32Array, source: Uint32Array, cols: number, rows: number, cell: number) {
    source.set(pixels)
    // An exactly flat field is the identity map and has no surface highlight.
    // Avoid resampling every sunlit garden pixel until an interaction adds waves.
    if (this.heights.every(height => height === 0)) return
    const epsilonX = this.dx * WATER.pixelsPerMetre, epsilonY = this.dy * WATER.pixelsPerMetre
    const block = 2
    for (let y = 0; y < rows; y += block) for (let x = 0; x < cols; x += block) {
      const px = (x + block / 2) * cell, py = (y + block / 2) * cell
      const sx = (this.sample(px + epsilonX, py) - this.sample(px - epsilonX, py)) / (2 * this.dx)
      const sy = (this.sample(px, py + epsilonY) - this.sample(px, py - epsilonY)) / (2 * this.dy)
      // Near-normal Snell refraction: apparent shift ~= depth*(1-1/1.333)*slope.
      const bend = 0.22 * (1 - 1 / 1.333) * WATER.pixelsPerMetre / cell
      const shiftX = Math.round(sx * bend), shiftY = Math.round(sy * bend)
      const directional = -sx * 0.65 - sy * 0.76
      // Broad sky reflection + a glancing highlight, zero on a flat surface.
      const surfaceLight = Math.max(-36, Math.min(85, directional * 950 + (sx * sx + sy * sy) * 3500))
      // Five hard shade levels, with no gradients between wake blocks.
      // Quantize only the displayed shade; the height field stays continuous.
      const light = Math.max(-24, Math.min(72, Math.round(surfaceLight / 24) * 24))
      for (let by = y; by < Math.min(y + block, rows); by++) for (let bx = x; bx < Math.min(x + block, cols); bx++) {
        const ox = Math.max(0, Math.min(cols - 1, bx + shiftX))
        const oy = Math.max(0, Math.min(rows - 1, by + shiftY))
        const p = source[oy * cols + ox]
        const r = Math.max(0, Math.min(255, (p & 255) + light * 0.72)) | 0
        const g = Math.max(0, Math.min(255, ((p >>> 8) & 255) + light * 0.92)) | 0
        const b = Math.max(0, Math.min(255, ((p >>> 16) & 255) + light)) | 0
        pixels[by * cols + bx] = (255 << 24) | (b << 16) | (g << 8) | r
      }
    }
  }
}
