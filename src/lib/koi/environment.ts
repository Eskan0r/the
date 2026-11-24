import type { PondAssets } from './assets'

// Shift olive foliage toward emerald and strengthen rose, copper and gold.
// Use the source channel differences so neutral highlights and alpha survive.
function enrichGardenColor(pixels: Uint8ClampedArray, i: number) {
  const red = pixels[i], green = pixels[i + 1], blue = pixels[i + 2]
  if (green >= red && red > blue) {
    const olive = red - blue
    pixels[i] = red - olive * 0.98
    pixels[i + 1] = green + olive * 0.28
    pixels[i + 2] = blue + olive * 0.36
  } else if (red > green) {
    const warmth = red - green
    pixels[i] = red + warmth * 0.3
    pixels[i + 1] = green - warmth * 0.24
    pixels[i + 2] = blue + (blue - green) * 0.32
  }
}

// Compose editable PNG sprites once per resize. Fish and light remain separate.
export function createPond(cols: number, rows: number, assets: PondAssets) {
  const bed = document.createElement('canvas')
  const mask = document.createElement('canvas')
  bed.width = mask.width = cols
  bed.height = mask.height = rows
  const g = bed.getContext('2d')!
  const m = mask.getContext('2d')!
  g.imageSmoothingEnabled = m.imageSmoothingEnabled = false
  g.drawImage(assets.images.background, 0, 0, cols, rows)
  // A cool deep pool opens into jade shallows. Overlay retains the PNG's texture.
  g.save()
  g.scale(cols, rows)
  const pool = g.createRadialGradient(0.62, 0.43, 0, 0.54, 0.49, 0.7)
  pool.addColorStop(0, 'rgba(8,95,164,.88)')
  pool.addColorStop(0.46, 'rgba(7,152,162,.84)')
  pool.addColorStop(0.78, 'rgba(22,181,134,.83)')
  pool.addColorStop(1, 'rgba(112,194,95,.78)')
  g.globalCompositeOperation = 'overlay'
  g.fillStyle = pool
  g.fillRect(0, 0, 1, 1)
  g.restore()
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
  // Keep open water between the floating plants, the bank, and loose pebbles.
  // Each bed is anchored to the view; offsets and clearances share the sprite scale.
  const clearings: { x: number; y: number; radius: number }[] = []
  function reserve(x: number, y: number, radius: number) {
    clearings.push({ x, y, radius: radius * unit })
  }
  const plants: { sprite: HTMLCanvasElement; x: number; y: number; phase: number; moving: boolean }[] = []
  function cachePlant(x: number, y: number, name: string, scale: number, moving: boolean, flower?: string, flowerScale = 0) {
    const image = assets.images[name], sprite = document.createElement('canvas')
    const width = image.width * scale / 4, height = image.height * scale / 4
    const left = Math.round(x - width / 2), top = Math.round(y - height / 2)
    sprite.width = Math.max(1, Math.round(width)); sprite.height = Math.max(1, Math.round(height))
    const plant = sprite.getContext('2d', { willReadFrequently: true })!
    plant.imageSmoothingEnabled = false
    plant.drawImage(image, 0, 0, sprite.width, sprite.height)
    if (flower) draw(plant, assets.images['flower-' + flower], x - left - unit, y - top - unit * 0.7, flowerScale)
    const pixels = plant.getImageData(0, 0, sprite.width, sprite.height)
    for (let i = 0; i < pixels.data.length; i += 4) {
      if (pixels.data[i + 3]) enrichGardenColor(pixels.data, i)
    }
    plant.putImageData(pixels, 0, 0)
    plants.push({ sprite, x: left + sprite.width / 2, y: top + sprite.height / 2,
      phase: 1.7 * x / cols + 2.3 * y / rows + plants.length * 0.54, moving })
  }
  function lily(x: number, y: number, radius: number, variant: number, flower?: 'pink' | 'ivory') {
    reserve(x, y, radius + 2.4)
    cachePlant(x, y, `lily-pad-${String(variant).padStart(2, '0')}`, radius * unit / 16, true, flower, unit * radius / 13)
  }

  const northX = cols * 0.275, northY = rows * 0.16
  lily(northX, northY, 6.8, 2, 'pink')
  lily(northX - 14 * unit, northY - 5 * unit, 4.9, 4)
  lily(northX + 10 * unit, northY - 9 * unit, 4.2, 6)
  const southX = cols * 0.26, southY = rows * 0.84
  lily(southX, southY, 6.5, 1, 'pink')
  lily(southX - 14 * unit, southY - 3 * unit, 5.2, 5)
  lily(southX + 7 * unit, southY + 10 * unit, 4.1, 3)
  const eastX = cols * 0.885, eastY = rows * 0.105
  lily(eastX, eastY, 5.5, 3, 'ivory')
  lily(eastX + 11 * unit, eastY + 5.5 * unit, 4, 6)

  for (const [index, x, y] of [[1, 0.13, 0.262], [2, 0.765, 0.065], [3, 0.89, 0.85], [4, 0.64, 0.938]]) {
    reserve(x * cols, y * rows, 4.9)
    cachePlant(x * cols, y * rows, `maple-leaf-${String(index).padStart(2, '0')}`, unit / 2, false)
  }

  // The exposed stones turn each corner in a short, stepped bank. Draw from
  // back to front so a rear stone's contact shadow never crosses a nearer face.
  const banks = [
    [0, 0, -2, 2.2, 8.2, 4], [0, 0, 11, -1, 7.1, 1],
    [0, 0, 22.6, -2, 4.9, 3], [0, 0, 1, 13, 4.8, 2],
    [0, 1, -1.4, -17.8, 6.2, 3], [0, 1, 3.2, -6, 8.1, 5],
    [0, 1, 16.8, -3.3, 6.6, 6], [0, 1, 27.4, 1.9, 4.6, 2],
    [1, 1, -1.2, -1.8, 7.4, 1], [1, 1, -13.4, -0.8, 5.4, 4], [1, 1, 0.7, -12.5, 4.9, 5],
  ].map(([edgeX, edgeY, dx, dy, radius, variant]) => ({
    x: cols * edgeX + dx * unit, y: rows * edgeY + dy * unit, radius, variant,
  })).sort((a, b) => (a.y + a.radius * unit) - (b.y + b.radius * unit))
  for (const bank of banks) reserve(bank.x, bank.y, bank.radius + 0.9)

  g.globalAlpha = 0.74 // Submerged stones pick up the color of the local water.
  for (let i = 0; i < 150; i++) {
    const side = i % 4, edge = Math.pow(random(), 1.8)
    let x: number, y: number
    if (side === 0) { x = edge * cols * 0.21; y = random() * rows }
    else if (side === 1) { x = cols * (1 - edge * 0.15); y = random() * rows }
    else if (side === 2) { x = random() * cols; y = edge * rows * 0.14 }
    else { x = random() * cols; y = rows * (1 - edge * 0.15) }
    const radius = 1.3 + random() * 2.45
    const variant = 1 + Math.floor(random() * 8)
    if (clearings.some(p => (p.x - x) ** 2 + (p.y - y) ** 2 < (p.radius + radius * unit) ** 2)) continue
    reserve(x, y, radius + 0.85)
    draw(g, assets.images[`river-rock-${String(variant).padStart(2, '0')}`], x, y, radius * unit / 8)
  }
  g.globalAlpha = 1
  for (const { x, y, radius, variant } of banks) {
    const name = `moss-rock-${String(variant).padStart(2, '0')}`
    draw(g, assets.images[name], x, y, radius * unit / 16)
    draw(m, assets.masks[name], x, y, radius * unit / 16)
  }
  const maskPixels = m.getImageData(0, 0, cols, rows).data
  const causticMask = new Uint8Array(cols * rows)
  const bedPixels = g.getImageData(0, 0, cols, rows).data
  for (let i = 0; i < causticMask.length; i++) causticMask[i] = maskPixels[i * 4]

  function drawSurface(ctx: CanvasRenderingContext2D, cell: number, time: number | null) {
    ctx.save()
    ctx.scale(cell, cell)
    // A blossom sheds a single petal into the open water between beds.
    if (time !== null && time >= 7) {
      const visit = time - 7, age = visit % 32
      if (age < 7) {
        const t = age / 7, north = Math.floor(visit / 32) % 2 === 0
        const drift = t * (1.7 - 0.7 * t)
        const x = (north ? northX : southX) + (2 + drift * 22) * unit
        const y = (north ? northY : southY) + (north ? 1 : -1) * (1 + 8 * drift + Math.sin(t * 5.4)) * unit
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(0.45 * Math.sin(2.6 * t))
        const size = Math.min(0.86, unit * 0.72)
        ctx.scale(size, size)
        ctx.globalAlpha = Math.min(1, (7 - age) / 1.6)
        ctx.fillStyle = '#cf7895'
        ctx.fillRect(-1, -1, 2, 2)
        ctx.fillStyle = '#ef9eaf'
        ctx.fillRect(0, -2, 2, 2)
        ctx.fillStyle = '#ffced1'
        ctx.fillRect(1, -2, 1, 1)
        ctx.restore()
      }
    }
    for (const plant of plants) {
      const { sprite, x, y, phase } = plant
      if (!plant.moving || time === null) {
        ctx.drawImage(sprite, x - sprite.width / 2, y - sprite.height / 2)
        continue
      }
      const swell = Math.sin(time * 0.93 + phase)
      const cross = Math.sin(time * 0.61 + phase * 1.4)
      ctx.save()
      ctx.translate(x + unit * (0.48 * cross + 0.13 * swell), y + unit * 0.55 * swell)
      ctx.rotate(0.035 * cross)
      ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2)
      ctx.restore()
    }
    ctx.restore()
  }
  return { pixels: new Uint32Array(bedPixels.buffer), drawSurface, causticMask }
}
