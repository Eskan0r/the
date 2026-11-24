// Offline source artwork for the exported PNGs in public/pond/.
// Runtime scenery loads the PNGs and must not import this baker.
// Every sprite is drawn on a small native raster and enlarged exactly 4x.
export function bakePondSprites(): Record<string, HTMLCanvasElement> {
  const sprites: Record<string, HTMLCanvasElement> = {}
  const make = (width: number, height: number, paint: (g: CanvasRenderingContext2D) => void) => {
    const native = document.createElement('canvas')
    native.width = width
    native.height = height
    paint(native.getContext('2d')!)
    const output = document.createElement('canvas')
    output.width = width * 4
    output.height = height * 4
    const g = output.getContext('2d')!
    g.imageSmoothingEnabled = false
    g.drawImage(native, 0, 0, output.width, output.height)
    return output
  }
  const seeded = (initial: number) => {
    let seed = initial
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0
      return (seed >>> 0) / 4294967296
    }
  }

  sprites.background = make(361, 226, g => {
    const cols = 361, rows = 226, unit = Math.min(cols / 160, rows / 100)
    const random = seeded(72841)
    const water = g.createLinearGradient(0, 0, cols * 0.65, rows)
    water.addColorStop(0, '#669f9e')
    water.addColorStop(0.28, '#85bcae')
    water.addColorStop(0.62, '#6eaea5')
    water.addColorStop(1, '#97c0ad')
    g.fillStyle = water
    g.fillRect(0, 0, cols, rows)
    const deep = g.createRadialGradient(cols * 0.61, rows * 0.42, 0, cols * 0.61, rows * 0.42, cols * 0.63)
    deep.addColorStop(0, 'rgba(41,113,121,.17)')
    deep.addColorStop(0.63, 'rgba(50,125,125,.04)')
    deep.addColorStop(1, 'rgba(221,219,163,.20)')
    g.fillStyle = deep
    g.fillRect(0, 0, cols, rows)
    for (let i = 0; i < 10; i++) {
      const x = random() * cols, y = random() * rows
      const glow = g.createRadialGradient(x, y, 0, x, y, (14 + random() * 20) * unit)
      glow.addColorStop(0, i % 3 ? 'rgba(220,232,183,.055)' : 'rgba(25,104,117,.065)')
      glow.addColorStop(1, 'rgba(110,180,170,0)')
      g.fillStyle = glow
      g.fillRect(0, 0, cols, rows)
    }
    for (let i = 0; i < cols * rows * 0.11; i++) {
      const x = Math.floor(random() * cols), y = Math.floor(random() * rows)
      g.fillStyle = random() > 0.5 ? 'rgba(236,237,196,.055)' : 'rgba(34,102,110,.04)'
      g.fillRect(x, y, 1, 1)
    }
  })

  const stone = (g: CanvasRenderingContext2D, center: number, radius: number, raised: boolean, variant: number) => {
    const random = seeded((raised ? 85753 : 57893) + variant * 1021)
    const unit = 2
    const aspect = 0.68 + random() * 0.28
    const rotation = random() * Math.PI
    const points: [number, number][] = []
    for (let i = 0; i < 12; i++) {
      const angle = i / 12 * Math.PI * 2
      const r = radius * (0.88 + random() * 0.18)
      points.push([Math.cos(angle) * r, Math.sin(angle) * r * aspect])
    }
    const path = () => {
      g.beginPath()
      points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y))
      g.closePath()
    }
    g.save()
    g.translate(center, center)
    // Contact shadows always fall down-right, independent of outline rotation.
    g.fillStyle = raised ? 'rgba(27,71,70,.43)' : 'rgba(36,91,95,.24)'
    g.beginPath()
    g.ellipse(1.7 * unit, 2.8 * unit, radius * 1.08, radius * aspect, rotation, 0, Math.PI * 2)
    g.fill()
    // This inverse-rotated light also keeps the sun upper-left on every face.
    g.rotate(rotation)
    const lightX = -Math.cos(rotation) - Math.sin(rotation)
    const lightY = Math.sin(rotation) - Math.cos(rotation)
    const shade = g.createLinearGradient(lightX * radius, lightY * radius, -lightX * radius, -lightY * radius)
    const warm = random() > 0.52
    shade.addColorStop(0, raised ? (warm ? '#d8d4ae' : '#bdc9bd') : (warm ? '#a6b9a5' : '#8eaca8'))
    shade.addColorStop(0.42, raised ? (warm ? '#a5b297' : '#95aaa2') : (warm ? '#7c9c8e' : '#709794'))
    shade.addColorStop(1, raised ? '#4a7470' : '#4b7d80')
    g.fillStyle = shade
    path()
    g.fill()
    g.save()
    path()
    g.clip()
    for (let i = 0; i < radius * radius * 0.17; i++) {
      const x = (random() * 2 - 1) * radius
      const y = (random() * 2 - 1) * radius * aspect
      g.fillStyle = random() > 0.58 ? 'rgba(234,233,197,.22)' : 'rgba(40,92,86,.12)'
      g.fillRect(Math.floor(x), Math.floor(y), 1 + Math.floor(random() * 2), 1)
    }
    if (raised) {
      const mossX = lightX * radius * 0.27
      const mossY = lightY * radius * 0.23
      for (let i = 0; i < 14; i++) {
        const a = random() * Math.PI * 2, r = random() * radius * 0.45
        g.fillStyle = ['#829657', '#99a962', '#b3bb74', '#6e8d53'][i % 4]
        g.beginPath()
        g.ellipse(mossX + Math.cos(a) * r, mossY + Math.sin(a) * r * 0.6, (0.8 + random() * 1.8) * unit, (0.6 + random()) * unit, 0, 0, Math.PI * 2)
        g.fill()
      }
    }
    g.restore()
    g.restore()
  }
  for (let i = 1; i <= 8; i++) sprites[`river-rock-${String(i).padStart(2, '0')}`] = make(32, 32, g => stone(g, 16, 8, false, i))
  for (let i = 1; i <= 6; i++) sprites[`moss-rock-${String(i).padStart(2, '0')}`] = make(64, 64, g => stone(g, 32, 16, true, i))

  const lily = (g: CanvasRenderingContext2D, angle: number) => {
    const radius = 16, unit = 2
    g.save()
    g.translate(24, 24)
    g.fillStyle = 'rgba(31,91,88,.31)'
    g.beginPath()
    g.ellipse(1.8 * unit, 2.4 * unit, radius * 1.04, radius * 0.83, angle, 0, Math.PI * 2)
    g.fill()
    g.rotate(angle)
    const leaf = g.createLinearGradient(-radius, -radius, radius, radius)
    leaf.addColorStop(0, '#c6cc7c')
    leaf.addColorStop(0.45, '#a1b66a')
    leaf.addColorStop(1, '#648e59')
    g.fillStyle = leaf
    g.beginPath()
    g.moveTo(0, 0)
    g.ellipse(0, 0, radius, radius * 0.8, 0, 0.18, Math.PI * 2 - 0.18)
    g.closePath()
    g.fill()
    g.strokeStyle = 'rgba(220,222,146,.43)'
    g.lineWidth = Math.max(0.5, unit * 0.35)
    for (let i = 1; i < 8; i++) {
      const a = i / 8 * Math.PI * 2
      g.beginPath()
      g.moveTo(-radius * 0.09, 0)
      g.lineTo(Math.cos(a) * radius * 0.84, Math.sin(a) * radius * 0.66)
      g.stroke()
    }
    g.restore()
  }
  for (let i = 1; i <= 6; i++) sprites[`lily-pad-${String(i).padStart(2, '0')}`] = make(48, 48, g => lily(g, (i - 1) * Math.PI / 3))

  const flower = (g: CanvasRenderingContext2D, pink: boolean) => {
    const x = 16, y = 16, u = 2
    g.fillStyle = 'rgba(48,92,75,.24)'
    g.beginPath()
    g.ellipse(x + u, y + 2 * u, 4.7 * u, 3 * u, 0, 0, Math.PI * 2)
    g.fill()
    for (let ring = 0; ring < 2; ring++) {
      const petals = ring ? 7 : 9
      for (let i = 0; i < petals; i++) {
        const a = i / petals * Math.PI * 2 + ring * 0.4
        g.fillStyle = pink ? (ring ? '#f4c3cc' : i % 2 ? '#d987a4' : '#e8a4ba') : (ring ? '#fff2d7' : i % 2 ? '#e6dfbd' : '#f7ebce')
        g.beginPath()
        g.ellipse(x + Math.cos(a) * (ring ? 1.1 : 2.1) * u, y + Math.sin(a) * (ring ? 0.8 : 1.6) * u, (ring ? 2.2 : 3) * u, (ring ? 0.8 : 1) * u, a, 0, Math.PI * 2)
        g.fill()
      }
    }
    g.fillStyle = '#e7be62'
    g.fillRect(x - u, y - u, 2 * u, 2 * u)
    g.fillStyle = '#fff0a4'
    g.fillRect(x - u, y - u, u, u)
  }
  sprites['flower-pink'] = make(32, 32, g => flower(g, true))
  sprites['flower-ivory'] = make(32, 32, g => flower(g, false))

  const maple = (g: CanvasRenderingContext2D, rotation: number, color: string) => {
    const u = 2 * 0.7
    const points = [[0,-4.5],[1,-1.8],[3,-3],[2.5,-0.8],[4.6,-0.8],[2.5,0.8],[3.1,2.3],[1,1.8],[0,3.4],[-1,1.8],[-3.1,2.3],[-2.5,0.8],[-4.6,-0.8],[-2.5,-0.8],[-3,-3],[-1,-1.8]]
    const path = () => {
      g.beginPath()
      points.forEach(([x, y], i) => i ? g.lineTo(x * u, y * u) : g.moveTo(x * u, y * u))
      g.closePath()
    }
    g.save()
    g.translate(12 + u, 12 + 1.7 * u)
    g.rotate(rotation)
    g.fillStyle = 'rgba(37,91,83,.2)'
    path()
    g.fill()
    g.restore()
    g.save()
    g.translate(12, 12)
    g.rotate(rotation)
    path()
    g.fillStyle = color
    g.fill()
    g.strokeStyle = '#efb880'
    g.lineWidth = 0.7
    g.beginPath()
    g.moveTo(0, -2.5 * u)
    g.lineTo(0, 5 * u)
    g.stroke()
    g.restore()
  }
  const mapleVariants: [number, string][] = [[-0.3, '#d47955'], [0.5, '#de8a68'], [-0.5, '#d96f4f'], [1, '#cb8553']]
  mapleVariants.forEach(([angle, color], i) => { sprites[`maple-leaf-${String(i + 1).padStart(2, '0')}`] = make(24, 24, g => maple(g, angle, color)) })
  return sprites
}
