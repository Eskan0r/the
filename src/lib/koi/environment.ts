import type { PondAssets } from './assets'

// Compose editable PNG sprites once per resize. Fish and light remain separate.
export function createPond(cols: number, rows: number, assets: PondAssets) {
  const bed = document.createElement('canvas')
  const surface = document.createElement('canvas')
  const mask = document.createElement('canvas')
  bed.width = surface.width = mask.width = cols
  bed.height = surface.height = mask.height = rows
  const g = bed.getContext('2d')!
  const s = surface.getContext('2d')!
  const m = mask.getContext('2d')!
  for (const context of [g, s, m]) context.imageSmoothingEnabled = false
  g.drawImage(assets.images.background, 0, 0, cols, rows)
  m.fillStyle = '#ffffff'
  m.fillRect(0, 0, cols, rows)
  let seed = 72841
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0
    return (seed >>> 0) / 4294967296
  }
  const unit = Math.min(cols / 160, rows / 100)
  const draw = (context: CanvasRenderingContext2D, image: CanvasImageSource & { width: number; height: number }, x: number, y: number, scale: number) => {
    // Assets are exported at four image pixels per original garden pixel.
    const width = image.width / 4 * scale, height = image.height / 4 * scale
    context.drawImage(image, Math.round(x - width / 2), Math.round(y - height / 2), Math.round(width), Math.round(height))
  }
  const stone = (x: number, y: number, radius: number, raised = false) => {
    const count = raised ? 6 : 8, prefix = raised ? 'moss-rock' : 'river-rock'
    const name = `${prefix}-${String(1 + Math.floor(random() * count)).padStart(2, '0')}`
    const scale = radius / (raised ? 16 : 8)
    draw(g, assets.images[name], x, y, scale)
    if (raised) draw(m, assets.masks[name], x, y, scale)
  }
  for (let i = 0; i < 175; i++) {
    const side = i % 4, edge = Math.pow(random(), 1.8)
    let x: number, y: number
    if (side === 0) { x = edge * cols * 0.21; y = random() * rows }
    else if (side === 1) { x = cols * (1 - edge * 0.15); y = random() * rows }
    else if (side === 2) { x = random() * cols; y = edge * rows * 0.14 }
    else { x = random() * cols; y = rows * (1 - edge * 0.15) }
    stone(x, y, (1.1 + random() * 2.8) * unit)
  }
  for (const [cx, cy, count, spread] of [
    [0.012, 0.055, 19, 19], [0.005, 0.91, 20, 20], [0.065, 1.035, 11, 17], [1.018, 1.005, 14, 19],
  ]) for (let i = 0; i < count; i++) {
    const angle = random() * Math.PI * 2, distance = Math.sqrt(random()) * spread * unit
    stone(cx * cols + Math.cos(angle) * distance, cy * rows + Math.sin(angle) * distance * 0.86, (3.8 + random() * 4.8) * unit, true)
  }
  for (const [x, y, radius, variant] of [
    [0.19, 0.055, 5.8, 2], [0.29, 0.09, 5.2, 3], [0.24, 0.185, 6.7, 6],
    [0.34, 0.155, 5.4, 1], [0.16, 0.235, 4, 2],
    [0.19, 0.79, 6.5, 2], [0.27, 0.89, 5.4, 1], [0.17, 0.955, 6.8, 3],
    [0.085, 0.80, 4, 3], [0.30, 0.985, 4.5, 5],
    [0.91, 0.055, 5.8, 3], [0.985, 0.145, 5.1, 4], [0.99, 0.02, 4.1, 2],
  ]) {
    draw(s, assets.images[`lily-pad-${String(variant).padStart(2, '0')}`], x * cols, y * rows, radius * unit / 16)
  }
  draw(s, assets.images['flower-pink'], cols * 0.30, rows * 0.17, unit / 2)
  draw(s, assets.images['flower-pink'], cols * 0.235, rows * 0.86, unit * 1.05 / 2)
  draw(s, assets.images['flower-ivory'], cols * 0.92, rows * 0.075, unit * 0.75 / 2)
  for (const [index, x, y] of [[1, 0.14, 0.265], [2, 0.83, 0.075], [3, 0.89, 0.87], [4, 0.68, 0.955]]) {
    draw(s, assets.images[`maple-leaf-${String(index).padStart(2, '0')}`], x * cols, y * rows, unit / 2)
  }
  const maskPixels = m.getImageData(0, 0, cols, rows).data
  const causticMask = new Uint8Array(cols * rows)
  for (let i = 0; i < causticMask.length; i++) causticMask[i] = maskPixels[i * 4]
  return { pixels: new Uint32Array(g.getImageData(0, 0, cols, rows).data.buffer), surface, causticMask }
}
