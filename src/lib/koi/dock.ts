import type { PondAssets } from './assets'

// A separate PNG keeps the pier editable and independent of pond-floor light.
export function drawDock(ctx: CanvasRenderingContext2D, width: number, height: number, dpr: number, assets: PondAssets) {
  const mobile = width / dpr < 600
  const key = mobile ? 'mobile' : 'desktop'
  const image = assets.images[`pier-${key}`], source = assets.pier[key]
  const pixel = 4 * dpr
  const w = Math.ceil(width / pixel), h = Math.ceil(height / pixel)
  const right = Math.round(Math.min(w * (mobile ? 0.25 : 0.235), 290 / 4)) * pixel
  const top = Math.round(h * (mobile ? 0.29 : 0.32)) * pixel
  const bottom = Math.round(h * (mobile ? 0.51 : 0.67)) * pixel
  const scaleX = right / source.deck.right
  const scaleY = (bottom - top) / (source.deck.bottom - source.deck.top)
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(image, source.bounds.x * scaleX, top + (source.bounds.y - source.deck.top) * scaleY,
    image.width * scaleX, image.height * scaleY)
  ctx.restore()
}
