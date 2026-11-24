// Forward caustic light baking. SI units and a flat receiving bed, z upward.
// References and presentation limits: docs/water-physics.md.
export const CAUSTIC_ATLAS = { size: 160, frames: 128, columns: 16, tilePixels: 640, seconds: 4, depth: 0.35, pixelsPerMetre: 700 }
const ETA = 1 / 1.333
const SUN = [0.25, 0.34, -Math.sqrt(1 - 0.25 ** 2 - 0.34 ** 2)]
const WAVES = [
  [3, 1, 0.009, 0.2], [1, 4, 0.007, 1.7], [-3, 2, 0.006, 3.2],
  [4, -3, 0.0045, 4.8], [2, -5, 0.004, 2.4],
  [7, 3, 0.0018, 0.9], [-5, 7, 0.0015, 3.9], [8, -2, 0.0014, 5.4],
]

export function refractSunlight(hx: number, hy: number) {
  const inverseLength = 1 / Math.sqrt(1 + hx * hx + hy * hy)
  const nx = -hx * inverseLength, ny = -hy * inverseLength, nz = inverseLength
  const cosine = -(SUN[0] * nx + SUN[1] * ny + SUN[2] * nz)
  const k = 1 - ETA * ETA * (1 - cosine * cosine)
  const normalWeight = ETA * cosine - Math.sqrt(Math.max(0, k))
  return { x: ETA * SUN[0] + normalWeight * nx, y: ETA * SUN[1] + normalWeight * ny, z: ETA * SUN[2] + normalWeight * nz }
}

export function bakeCausticFrame(time: number, amplitude = 1) {
  const { size, tilePixels, pixelsPerMetre, seconds, depth } = CAUSTIC_ATLAS
  const tile = tilePixels / pixelsPerMetre
  const density = 2 // four uniformly distributed light rays per receiving texel
  const samples = size * density
  const flux = new Float32Array(size * size)
  const waves = WAVES.map(([x, y, a, phase]) => {
    const kx = Math.PI * 2 * x / tile, ky = Math.PI * 2 * y / tile
    const k = Math.hypot(kx, ky)
    const omega = Math.sqrt((9.81 * k + 0.0728 / 998.2 * k ** 3) * Math.tanh(k * depth))
    // Quantized dispersion gives a seamless four-second physical wave loop.
    const loopOmega = Math.round(omega * seconds / (Math.PI * 2)) * Math.PI * 2 / seconds
    return { kx, ky, a: a * amplitude, phase: phase - loopOmega * time }
  })
  for (let y = 0; y < samples; y++) for (let x = 0; x < samples; x++) {
    const px = (x + 0.5) / samples * tile, py = (y + 0.5) / samples * tile
    let height = 0, hx = 0, hy = 0
    for (const w of waves) {
      const angle = w.kx * px + w.ky * py + w.phase
      const slope = w.a * Math.cos(angle)
      height += w.a * Math.sin(angle)
      hx += slope * w.kx; hy += slope * w.ky
    }
    const ray = refractSunlight(hx, hy)
    const distance = (-depth - height) / ray.z
    const bx = (px + distance * ray.x) / tile * size - 0.5
    const by = (py + distance * ray.y) / tile * size - 0.5
    const ix = Math.floor(bx), iy = Math.floor(by), fx = bx - ix, fy = by - iy
    // Flux is measured per horizontal launch area, not tilted surface area.
    const weight = Math.max(0, (SUN[0] * hx + SUN[1] * hy - SUN[2]) / -SUN[2]) / (density * density)
    for (let oy = 0; oy < 2; oy++) for (let ox = 0; ox < 2; ox++) {
      // Periodic surface and receiver preserve rays crossing tile boundaries.
      const sx = ((ix + ox) % size + size) % size, sy = ((iy + oy) % size + size) % size
      flux[sy * size + sx] += weight * (ox ? fx : 1 - fx) * (oy ? fy : 1 - fy)
    }
  }
  return flux
}
