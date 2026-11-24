import { CAUSTIC_ATLAS } from './optics'

let atlas: Promise<Uint8Array[]> | undefined

async function decodeAtlas() {
  const { size, columns, frames } = CAUSTIC_ATLAS
  const image = new Image()
  image.src = '/pond/sunlight-atlas.png'
  await image.decode()
  if (image.naturalWidth !== size * columns || image.naturalHeight !== size * Math.ceil(frames / columns)) {
    throw new Error('Unexpected caustic atlas dimensions')
  }
  const strip = document.createElement('canvas')
  strip.width = size * columns
  strip.height = size
  const ctx = strip.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Unable to read pond lighting')
  const maps: Uint8Array[] = []
  for (let first = 0; first < frames; first += columns) {
    if (first) await new Promise(done => setTimeout(done, 0))
    ctx.drawImage(image, 0, first / columns * size, strip.width, size, 0, 0, strip.width, size)
    const rgba = ctx.getImageData(0, 0, strip.width, size).data
    for (let column = 0; column < columns && first + column < frames; column++) {
      const map = new Uint8Array(size * size)
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        map[y * size + x] = rgba[(y * strip.width + column * size + x) * 4]
      }
      maps.push(map)
    }
  }
  return maps
}

export function loadAtlas() {
  return atlas ??= decodeAtlas().catch(error => { atlas = undefined; throw error })
}

// Fixed directional sun, baked refracted-ray irradiance. Playback and exposure
// are art-directed; the light distribution comes from optics.ts, not cell edges.
export class PondSunlight {
  private light: Float32Array
  private lastTime = -1
  private coordinates: Uint32Array

  constructor(private cols: number, private rows: number, private cell: number, private maps: Uint8Array[]) {
    this.light = new Float32Array(cols * rows)
    this.coordinates = new Uint32Array(cols * rows)
    const { size, tilePixels } = CAUSTIC_ATLAS
    const viewScale = Math.max(0.6, Math.min(1, cols * cell / 1000))
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const sx = Math.floor(x * cell / (tilePixels * viewScale) * size) % size
      const sy = Math.floor(y * cell / (tilePixels * viewScale) * size) % size
      this.coordinates[y * cols + x] = sy * size + sx
    }
  }

  update(time: number) {
    if (time === this.lastTime) return
    this.lastTime = time
    const { frames, seconds } = CAUSTIC_ATLAS
    const frame = (time * 0.22 / seconds * frames) % frames
    const index = Math.floor(frame), mix = frame - index
    const first = this.maps[index], next = this.maps[(index + 1) % frames]
    for (let pixel = 0; pixel < this.light.length; pixel++) {
      const i = this.coordinates[pixel]
      const irradiance = (first[i] * (1 - mix) + next[i] * mix) * 4 / 255
      // Compress the brightest ribbons above twice the mean irradiance.
      this.light[pixel] = irradiance > 1.25
        ? Math.min((irradiance - 1.25) * 27, 20.25 + (irradiance - 2) * 13)
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
