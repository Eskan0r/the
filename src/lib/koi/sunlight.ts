import { CAUSTIC_ATLAS } from './optics'

let atlas: Promise<Uint8Array[]> | undefined
function loadAtlas() {
  if (atlas) return atlas
  atlas = new Promise(resolve => {
    const image = new Image()
    image.onload = () => {
      const { size, columns, frames } = CAUSTIC_ATLAS
      const canvas = document.createElement('canvas')
      canvas.width = image.width; canvas.height = image.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      const maps: Uint8Array[] = []
      for (let frame = 0; frame < frames; frame++) {
        const map = new Uint8Array(size * size)
        const ox = (frame % columns) * size, oy = Math.floor(frame / columns) * size
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) map[y * size + x] = rgba[((oy + y) * canvas.width + ox + x) * 4]
        maps.push(map)
      }
      resolve(maps)
    }
    image.onerror = () => resolve([])
    image.src = '/pond/sunlight-atlas.png'
  })
  return atlas
}

// Fixed directional sun, baked refracted-ray irradiance. Playback and exposure
// are art-directed; the light distribution comes from optics.ts, not cell edges.
export class PondSunlight {
  private maps: Uint8Array[] = []
  private light: Float32Array
  private lastTick = -1

  constructor(private cols: number, private rows: number, private cell: number) {
    this.light = new Float32Array(cols * rows)
    void loadAtlas().then(maps => { this.maps = maps; this.lastTick = -1 })
  }

  update(time: number) {
    if (!this.maps.length) return
    const tick = Math.floor(time * 30)
    if (tick === this.lastTick) return
    this.lastTick = tick
    const { size, frames, seconds, tilePixels } = CAUSTIC_ATLAS
    const frame = (tick / 30 * 0.22 / seconds * frames) % frames
    const index = Math.floor(frame), mix = frame - index
    const first = this.maps[index], next = this.maps[(index + 1) % frames]
    const viewScale = Math.max(0.6, Math.min(1, this.cols * this.cell / 1000))
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      const sx = Math.floor(x * this.cell / (tilePixels * viewScale) * size) % size
      const sy = Math.floor(y * this.cell / (tilePixels * viewScale) * size) % size
      const i = sy * size + sx
      const irradiance = (first[i] * (1 - mix) + next[i] * mix) * 4 / 255
      // Keep ambient water readable and reserve highlights for focused rays.
      this.light[y * this.cols + x] = irradiance > 1.25
        ? Math.min(60, (irradiance - 1.25) * 27)
        : Math.max(-12, (irradiance - 1) * 16)
    }
  }

  apply(pixels: Uint32Array, mask?: Uint8Array, fish?: Int16Array) {
    for (let i = 0; i < pixels.length; i++) {
      if (fish && fish[i] < 0) continue
      const p = pixels[i], l = this.light[i] * (mask ? mask[i] / 255 : 1) * (fish ? 0.22 : 1)
      const r = Math.max(0, Math.min(255, (p & 255) + l * 0.92)) | 0
      const g = Math.max(0, Math.min(255, ((p >>> 8) & 255) + l)) | 0
      const b = Math.max(0, Math.min(255, ((p >>> 16) & 255) + l * 0.82)) | 0
      pixels[i] = (255 << 24) | (b << 16) | (g << 8) | r
    }
  }
}
