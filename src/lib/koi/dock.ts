// The empty pier is cached on the same four-CSS-pixel raster as the pond.
let cached: { width: number; height: number; dpr: number; canvas: HTMLCanvasElement } | undefined

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
  const rect = (x: number, y: number, rw: number, rh: number, color: string) => {
    g.fillStyle = color
    g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(rw)), Math.max(1, Math.round(rh)))
  }

  // Substructure and offset shadow anchor the platform above the water.
  rect(0, top + 5, right + 5, bottom - top, 'rgba(21,62,60,.24)')
  rect(0, top + 10, right + 8, bottom - top - 5, 'rgba(21,62,60,.12)')
  rect(0, top - 1, right, bottom - top + 3, '#68513e')
  rect(0, bottom, right, 3, '#4b4033')
  const plank = Math.max(4, Math.round(Math.min(7, right / 8)))
  const colors = ['#ac8d6c', '#b49575', '#a18464', '#bd9e7c', '#aa8e6c']
  for (let x = -2, i = 0; x < right; x += plank, i++) {
    const end = bottom - (i % 3 === 1 ? 1 : 0)
    rect(x, top, Math.min(plank - 1, right - x), end - top, colors[i % colors.length])
    rect(x + 1, top + 2, 1, end - top - 4, '#ccb08b')
    rect(x + plank - 2, top + 4, 1, end - top - 7, '#8d7257')
    for (let j = 0; j < 5; j++) {
      const y = top + 5 + ((i * 19 + j * 13) % Math.max(1, bottom - top - 12))
      rect(x + 2 + (j % 2), y, 1, 2 + ((i + j) % 4), '#927657')
    }
    rect(x + 2, top + 3, 1, 1, '#74604a')
    rect(x + 2, bottom - 4, 1, 1, '#74604a')
  }

  // Three sides are enclosed by timber rails; the bank-side entrance stays open.
  const fenceX = right - 2, fenceTop = top + 1, fenceBottom = bottom - 2
  rect(0, fenceTop + 4, fenceX, 2, 'rgba(57,47,35,.15)')
  rect(0, fenceBottom + 3, fenceX + 3, 2, 'rgba(22,57,55,.19)')
  rect(fenceX + 3, fenceTop + 4, 2, fenceBottom - fenceTop, 'rgba(22,57,55,.2)')
  for (const y of [fenceTop, fenceBottom]) {
    rect(0, y + 1, fenceX + 1, 2, '#70583e')
    rect(0, y, fenceX + 1, 1, '#ddc199')
  }
  rect(fenceX, fenceTop, 2, fenceBottom - fenceTop + 2, '#765d42')
  rect(fenceX - 1, fenceTop, 1, fenceBottom - fenceTop, '#d2b58c')

  const post = (x: number, y: number) => {
    rect(x, y + 3, 4, 3, 'rgba(40,54,43,.22)')
    rect(x - 1, y, 3, 4, '#775d41')
    rect(x - 1, y, 1, 3, '#b7976e')
    rect(x - 2, y - 2, 5, 3, '#bfa17b')
    rect(x - 2, y - 2, 4, 1, '#e6cdab')
    rect(x - 1, y - 1, 2, 1, '#d3b68e')
  }
  const horizontalBays = Math.max(2, Math.round(fenceX / 17))
  for (let i = 0; i <= horizontalBays; i++) {
    const x = Math.round(i / horizontalBays * fenceX)
    post(x, fenceTop); post(x, fenceBottom)
  }
  const verticalBays = Math.max(2, Math.round((fenceBottom - fenceTop) / 17))
  for (let i = 1; i < verticalBays; i++) post(fenceX, fenceTop + i / verticalBays * (fenceBottom - fenceTop))
  return { width, height, dpr, canvas }
}

/** Dimensions use backing-canvas pixels; the platform is completely static. */
export function drawDock(ctx: CanvasRenderingContext2D, width: number, height: number, dpr = Math.min(window.devicePixelRatio || 1, 2)) {
  if (!cached || cached.width !== width || cached.height !== height || cached.dpr !== dpr) cached = paintDock(width, height, dpr)
  ctx.save()
  ctx.imageSmoothingEnabled = false
  const pixel = 4 * dpr
  ctx.drawImage(cached.canvas, 0, 0, cached.canvas.width * pixel, cached.canvas.height * pixel)
  ctx.restore()
}
