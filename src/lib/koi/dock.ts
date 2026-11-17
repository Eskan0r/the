// The little landing is painted at pond scale, then enlarged without smoothing.
// Keeping the timber and figure cached leaves only the float moving each frame.
let cached: { width: number; height: number; dpr: number; canvas: HTMLCanvasElement; tipX: number; tipY: number } | undefined

function paintDock(width: number, height: number, dpr: number) {
  const canvas = document.createElement('canvas')
  const pixel = 4 * dpr
  canvas.width = Math.ceil(width / pixel)
  canvas.height = Math.ceil(height / pixel)
  const g = canvas.getContext('2d')!
  const w = canvas.width, h = canvas.height
  const mobile = width / dpr < 600
  const right = Math.round(Math.min(w * (mobile ? 0.25 : 0.235), 290 / 4))
  const top = Math.round(h * (mobile ? 0.29 : 0.32))
  const bottom = Math.round(h * (mobile ? 0.51 : 0.67))
  const middle = Math.round((top + bottom) / 2)
  const size = Math.min(1, right / 55, (bottom - top) / 54)
  const rect = (x: number, y: number, rw: number, rh: number, color: string) => {
    g.fillStyle = color
    g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(rw)), Math.max(1, Math.round(rh)))
  }
  const ellipse = (cx: number, cy: number, rx: number, ry: number, color: string) => {
    g.fillStyle = color
    for (let row = -Math.ceil(ry); row <= Math.ceil(ry); row++) {
      const span = Math.floor(rx * Math.sqrt(Math.max(0, 1 - row * row / (ry * ry))))
      if (span) g.fillRect(Math.round(cx) - span, Math.round(cy) + row, span * 2 + 1, 1)
    }
  }
  // Offset, broken shadows keep the dock grounded in the water.
  rect(0, top + 5, right + 5, bottom - top, 'rgba(3,18,23,.28)')
  rect(0, top + 10, right + 8, bottom - top - 5, 'rgba(3,18,23,.2)')
  rect(0, top - 1, right, bottom - top + 3, '#483e34')
  rect(0, bottom, right, 3, '#302f2b')
  const plank = Math.max(4, Math.round(7 * size))
  const colors = ['#977b5b', '#9e8162', '#8a7054', '#a88a67', '#92795b']
  for (let x = -2, i = 0; x < right; x += plank, i++) {
    const end = bottom - (i % 3 === 1 ? 1 : 0)
    rect(x, top + (i % 4 === 2 ? 1 : 0), Math.min(plank - 1, right - x), end - top, colors[i % colors.length])
    rect(x + 1, top + 2, 1, end - top - 4, '#b29470')
    rect(x + plank - 2, top + 4, 1, end - top - 7, '#796148')
    for (let j = 0; j < 5; j++) {
      const y = top + 5 + ((i * 19 + j * 13) % Math.max(1, bottom - top - 12))
      rect(x + 2 + (j % 2), y, 1, 2 + ((i + j) % 4), '#7d654d')
    }
    rect(x + 2, top + 3, 1, 1, '#514b3e')
    rect(x + 2, bottom - 4, 1, 1, '#514b3e')
  }
  // Round end posts with a warm cut face and two turns of rope.
  for (const y of [top + 1, bottom - 1]) {
    ellipse(right - 1, y + 2, 3 * size + 1, 3 * size + 1, '#4c4535')
    ellipse(right - 2, y, 3 * size + 1, 2 * size + 1, '#ad9168')
    rect(right - 3, y - 1, 2, 1, '#c7ab7e')
    rect(right - 4, y + 1, 4, 1, '#706047')
    rect(right - 3, y + 3, 3, 1, '#b69c71')
  }
  // Seated gardener, seen from above: folded indigo robe and straw kasa.
  const fx = right - 13 * size, fy = middle
  ellipse(fx - 2 * size, fy + 4 * size, 14 * size, 13 * size, 'rgba(24,27,28,.38)')
  ellipse(fx + 2 * size, fy - 9 * size, 5 * size, 5 * size, '#263d50')
  ellipse(fx + 3 * size, fy + 10 * size, 6 * size, 5 * size, '#263c4c')
  ellipse(fx + 4 * size, fy - 9 * size, 4 * size, 3 * size, '#344f63')
  ellipse(fx + 4 * size, fy + 9 * size, 4 * size, 3 * size, '#3d5667')
  ellipse(fx - 4 * size, fy, 9 * size, 11 * size, '#2d4658')
  rect(fx - 7 * size, fy + 5 * size, 8 * size, 2 * size, '#385267')
  // Forearms meet at the fishing rod, with the sleeves just behind them.
  rect(fx + 3 * size, fy - 6 * size, 3 * size, 5 * size, '#1d3548')
  rect(fx + 5 * size, fy - 3 * size, 2 * size, 5 * size, '#b9966a')
  rect(fx + 4 * size, fy + 4 * size, 3 * size, 2 * size, '#b9966a')
  rect(fx + 7 * size, fy + 1 * size, 2 * size, 4 * size, '#d2b380')
  // Stepped circular hat, shaded away from the upper-left light.
  ellipse(fx - 7 * size, fy, 10 * size, 10 * size, '#796b47')
  ellipse(fx - 8 * size, fy - 1 * size, 10 * size, 10 * size, '#b7a16a')
  ellipse(fx - 9 * size, fy - 3 * size, 8 * size, 7 * size, '#cbb67b')
  ellipse(fx - 10 * size, fy - 4 * size, 5 * size, 5 * size, '#d4c08a')
  rect(fx - 13 * size, fy + 6 * size, 7 * size, 1, '#a08a58')
  rect(fx - 5 * size, fy - 6 * size, 1, 10 * size, '#bba36b')
  const tipX = Math.round(mobile ? w * 0.48 : Math.min(w * 0.48, right + w * 0.23))
  const tipY = Math.round(middle - 1)
  // A raster line avoids introducing a smooth vector edge among the pond pixels.
  const line = (ax: number, ay: number, bx: number, by: number, color: string) => {
    const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay))
    for (let i = 0; i <= steps; i++) rect(ax + (bx - ax) * i / steps, ay + (by - ay) * i / steps, 1, 1, color)
  }
  line(Math.round(fx + 2 * size), Math.round(fy + 6 * size), tipX - 4, tipY - 2, '#b8a16b')
  line(Math.round(fx + 3 * size), Math.round(fy + 6 * size), tipX - 5, tipY - 1, '#796f4d')
  line(tipX - 4, tipY - 2, tipX, tipY + 1, 'rgba(214,211,173,.52)')
  return { width, height, dpr, canvas, tipX, tipY }
}

/** width and height use backing-canvas pixels; time is elapsed seconds. */
export function drawDock(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, dpr = Math.min(window.devicePixelRatio || 1, 2)) {
  if (!cached || cached.width !== width || cached.height !== height || cached.dpr !== dpr) cached = paintDock(width, height, dpr)
  ctx.save()
  ctx.imageSmoothingEnabled = false
  const pixel = 4 * dpr
  ctx.drawImage(cached.canvas, 0, 0, cached.canvas.width * pixel, cached.canvas.height * pixel)
  const x = cached.tipX * pixel, y = (cached.tipY + 2 + Math.round(Math.sin(time * 1.4) * 0.5)) * pixel
  // One quiet float, with a broken reflection under it.
  ctx.fillStyle = 'rgba(191,206,170,.19)'
  ctx.fillRect(x - pixel, y + pixel * 2, pixel * 3, pixel)
  ctx.fillStyle = '#d0bd87'
  ctx.fillRect(x, y, pixel, pixel)
  ctx.fillStyle = '#a16d48'
  ctx.fillRect(x, y + pixel, pixel, pixel)
  ctx.restore()
}
