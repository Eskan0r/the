import { CAUSTIC_ATLAS } from './optics'

let atlas: Promise<Uint8Array[]> | undefined
let readyMaps: Uint8Array[] | undefined
export function loadAtlas() {
  if (atlas) return atlas
  atlas = new Promise(resolve => {
    const image = new Image()
    image.onload = async () => {
      try {
        const { size, columns, frames } = CAUSTIC_ATLAS
        const canvas = document.createElement('canvas')
        canvas.width = image.width; canvas.height = image.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(image, 0, 0)
        const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data
        const maps: Uint8Array[] = []
        for (let frame = 0; frame < frames; frame++) {
          if (frame && frame % 16 === 0) await new Promise(done => setTimeout(done, 0))
          const map = new Uint8Array(size * size)
          const ox = (frame % columns) * size, oy = Math.floor(frame / columns) * size
          for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) map[y * size + x] = rgba[((oy + y) * canvas.width + ox + x) * 4]
          maps.push(map)
        }
        readyMaps = maps
        resolve(maps)
      } catch { resolve([]) }
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
  private lastTime = -1
  private coordinates: Uint32Array

  private arrival: number | undefined
  constructor(private cols: number, private rows: number, private cell: number) {
    this.light = new Float32Array(cols * rows)
    this.coordinates = new Uint32Array(cols * rows)
    const { size, tilePixels } = CAUSTIC_ATLAS
    const viewScale = Math.max(0.6, Math.min(1, cols * cell / 1000))
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const sx = Math.floor(x * cell / (tilePixels * viewScale) * size) % size
      const sy = Math.floor(y * cell / (tilePixels * viewScale) * size) % size
      this.coordinates[y * cols + x] = sy * size + sx
    }
    if (readyMaps) this.maps = readyMaps
    else void loadAtlas().then(maps => { this.maps = maps; this.lastTime = -1; this.arrival = -1 })
  }

  update(time: number, still = false) {
    if (!this.maps.length) return
    if (time === this.lastTime) return
    this.lastTime = time
    if (this.arrival === -1) this.arrival = time
    const exposure = still || this.arrival === undefined ? 1 : Math.min(1, (time - this.arrival) / 0.65)
    const { frames, seconds } = CAUSTIC_ATLAS
    const frame = (time * 0.22 / seconds * frames) % frames
    const index = Math.floor(frame), mix = frame - index
    const first = this.maps[index], next = this.maps[(index + 1) % frames]
    for (let pixel = 0; pixel < this.light.length; pixel++) {
      const i = this.coordinates[pixel]
      const irradiance = (first[i] * (1 - mix) + next[i] * mix) * 4 / 255
      // Keep ambient water readable and reserve highlights for focused rays.
      this.light[pixel] = exposure * (irradiance > 1.25
        ? Math.min(60, (irradiance - 1.25) * 27)
        : Math.max(-12, (irradiance - 1) * 16))
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
