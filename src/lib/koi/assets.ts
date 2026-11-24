// Separate, editable PNGs. Layout stays in code; these files own the artwork.
const variants = (folder: string, prefix: string, count: number) => Object.fromEntries(
  Array.from({ length: count }, (_, i) => {
    const name = `${prefix}-${String(i + 1).padStart(2, '0')}`
    return [name, `/pond/scenery/${folder}/${name}.png`]
  }),
)
export const POND_ASSET_PATHS: Readonly<Record<string, string>> = {
  background: '/pond/scenery/background.png',
  ...variants('rocks', 'river-rock', 8),
  ...variants('rocks', 'moss-rock', 6),
  ...variants('lilypads', 'lily-pad', 6),
  'flower-pink': '/pond/scenery/flowers/flower-pink.png',
  'flower-ivory': '/pond/scenery/flowers/flower-ivory.png',
  ...variants('leaves', 'maple-leaf', 4),
  'pier-desktop': '/pond/scenery/pier/pier-desktop.png',
  'pier-mobile': '/pond/scenery/pier/pier-mobile.png',
}
export type PierLayout = {
  bounds: { x: number; y: number; width: number; height: number }
  deck: { right: number; top: number; bottom: number }
}
export type PondAssets = {
  images: Record<string, HTMLImageElement | HTMLCanvasElement>
  masks: Record<string, HTMLCanvasElement>
  pier: Record<'desktop' | 'mobile', PierLayout>
}
let pending: Promise<PondAssets> | undefined

// Work on the stone's own pigment before it touches water or another sprite.
// Mineral faces have much less yellow-green chroma than the painted moss.
function shadeBankPixel(data: Uint8ClampedArray, i: number, coverage: number) {
  const r = data[i], g = data[i + 1], b = data[i + 2]
  const moss = Math.max(0, Math.min(1, (g - b - 29) / 30, (g - r + 4) / 12))
  const light = g - 154
  data[i] = r + coverage * ((1 - moss) * (light * 0.35 - 4) + moss * (light * 0.55 - 19))
  data[i + 1] = g + coverage * ((1 - moss) * light * 0.2 + moss * (light * 0.32 + 13))
  data[i + 2] = b + coverage * ((1 - moss) * (5 - light * 0.06) + moss * (light * 0.13 - 4))
}

export function loadPondAssets(): Promise<PondAssets> {
  if (pending) return pending
  pending = Promise.all([
    Promise.all(Object.entries(POND_ASSET_PATHS).map(async ([name, path]) => {
      const image = new Image()
      image.src = path
      await image.decode()
      return [name, image] as const
    })),
    fetch('/pond/scenery/pier/layout.json').then(response => {
      if (!response.ok) throw new Error('Unable to load pier layout')
      return response.json() as Promise<PondAssets['pier']>
    }),
  ]).then(([entries, pier]) => {
    const images: PondAssets['images'] = Object.fromEntries(entries)
    const masks: Record<string, HTMLCanvasElement> = {}
    // Derive bank-lighting silhouettes from alpha, so editing a rock PNG also
    // updates its caustic mask without requiring a second hand-maintained image.
    for (const [name, image] of entries) {
      if (!name.startsWith('moss-rock-')) continue
      const canvas = document.createElement('canvas')
      canvas.width = image.width; canvas.height = image.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const mask = document.createElement('canvas')
      mask.width = image.width; mask.height = image.height
      const maskContext = mask.getContext('2d')!
      const silhouette = maskContext.createImageData(mask.width, mask.height)
      for (let i = 0; i < pixels.data.length; i += 4) {
        const alpha = pixels.data[i + 3] / 255
        const coverage = Math.max(0, Math.min(1, (alpha - 0.45) / 0.55))
        if (!coverage) continue
        shadeBankPixel(pixels.data, i, coverage)
        silhouette.data[i] = silhouette.data[i + 1] = silhouette.data[i + 2] = 48
        silhouette.data[i + 3] = coverage * 255
      }
      ctx.putImageData(pixels, 0, 0)
      maskContext.putImageData(silhouette, 0, 0)
      images[name] = canvas
      masks[name] = mask
    }
    return { images, masks, pier }
  }).catch(error => { pending = undefined; throw error })
  return pending
}
