// Cached garden layers share the pond's pixel raster. Sunlight comes from the
// upper left; submerged stones, raised banks and floating leaves stay distinct.
export function createPond(cols: number, rows: number) {
  const bed = document.createElement('canvas')
  const surface = document.createElement('canvas')
  const mask = document.createElement('canvas')
  bed.width = surface.width = mask.width = cols
  bed.height = surface.height = mask.height = rows
  const g = bed.getContext('2d')!
  const s = surface.getContext('2d')!
  const m = mask.getContext('2d')!
  m.fillStyle = '#ffffff'
  m.fillRect(0, 0, cols, rows)
  let seed = 72841
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0
    return (seed >>> 0) / 4294967296
  }
  const unit = Math.min(cols / 160, rows / 100)
  const water = g.createLinearGradient(0, 0, cols * 0.65, rows)
  water.addColorStop(0, '#669f9e')
  water.addColorStop(0.28, '#85bcae')
  water.addColorStop(0.62, '#6eaea5')
  water.addColorStop(1, '#97c0ad')
  g.fillStyle = water
  g.fillRect(0, 0, cols, rows)

  // Broad submerged shelves make the depth change gradually toward the edges.
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
  // Scattered grains remain quiet enough for the refracted light to read.
  for (let i = 0; i < cols * rows * 0.11; i++) {
    const x = Math.floor(random() * cols), y = Math.floor(random() * rows)
    g.fillStyle = random() > 0.5 ? 'rgba(236,237,196,.055)' : 'rgba(34,102,110,.04)'
    g.fillRect(x, y, 1, 1)
  }

  function stone(x: number, y: number, radius: number, raised = false) {
    const aspect = 0.68 + random() * 0.28
    const rotation = random() * Math.PI
    const points: [number, number][] = []
    for (let i = 0; i < 12; i++) {
      const angle = i / 12 * Math.PI * 2
      const r = radius * (0.88 + random() * 0.18)
      points.push([Math.cos(angle) * r, Math.sin(angle) * r * aspect])
    }
    const path = (context: CanvasRenderingContext2D) => {
      context.beginPath()
      points.forEach(([px, py], i) => i ? context.lineTo(px, py) : context.moveTo(px, py))
      context.closePath()
    }
    g.save()
    g.translate(x, y)
    g.rotate(rotation)
    g.fillStyle = raised ? 'rgba(27,71,70,.43)' : 'rgba(36,91,95,.24)'
    g.beginPath()
    g.ellipse(1.7 * unit, 2.8 * unit, radius * 1.08, radius * aspect, 0, 0, Math.PI * 2)
    g.fill()
    // Light stays upper-left in world space, even when the outline is rotated.
    const lightX = -Math.cos(rotation) - Math.sin(rotation)
    const lightY = Math.sin(rotation) - Math.cos(rotation)
    const shade = g.createLinearGradient(lightX * radius, lightY * radius, -lightX * radius, -lightY * radius)
    const warm = random() > 0.52
    shade.addColorStop(0, raised ? (warm ? '#d8d4ae' : '#bdc9bd') : (warm ? '#a6b9a5' : '#8eaca8'))
    shade.addColorStop(0.42, raised ? (warm ? '#a5b297' : '#95aaa2') : (warm ? '#7c9c8e' : '#709794'))
    shade.addColorStop(1, raised ? '#4a7470' : '#4b7d80')
    g.fillStyle = shade
    path(g)
    g.fill()
    g.save()
    path(g)
    g.clip()
    // Mineral facets are small broken patches rather than noisy outlines.
    for (let i = 0; i < radius * radius * 0.17; i++) {
      const px = (random() * 2 - 1) * radius
      const py = (random() * 2 - 1) * radius * aspect
      g.fillStyle = random() > 0.58 ? 'rgba(234,233,197,.22)' : 'rgba(40,92,86,.12)'
      g.fillRect(Math.floor(px), Math.floor(py), 1 + Math.floor(random() * 2), 1)
    }
    if (raised && radius > 3 * unit) {
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
    if (raised) {
      m.save()
      m.translate(x, y)
      m.rotate(rotation)
      m.fillStyle = '#303030'
      path(m)
      m.fill()
      m.restore()
    }
  }

  // A visible rim of blue-gray river pebbles beneath the transparent water.
  for (let i = 0; i < 175; i++) {
    const side = i % 4
    const edge = Math.pow(random(), 1.8)
    let x: number, y: number
    if (side === 0) { x = edge * cols * 0.21; y = random() * rows }
    else if (side === 1) { x = cols * (1 - edge * 0.15); y = random() * rows }
    else if (side === 2) { x = random() * cols; y = edge * rows * 0.14 }
    else { x = random() * cols; y = rows * (1 - edge * 0.15) }
    // The dock covers this bank, leaving the open water deliberately spacious.
    stone(x, y, (1.1 + random() * 2.8) * unit)
  }
  for (const [cx, cy, count, spread] of [
    [0.012, 0.055, 19, 19], [0.005, 0.91, 20, 20], [0.065, 1.035, 11, 17], [1.018, 1.005, 14, 19],
  ]) {
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2
      const distance = Math.sqrt(random()) * spread * unit
      stone(cx * cols + Math.cos(angle) * distance, cy * rows + Math.sin(angle) * distance * 0.86, (3.8 + random() * 4.8) * unit, true)
    }
  }

  function lily(x: number, y: number, radius: number, angle: number) {
    s.save()
    s.translate(x, y)
    // Offset contact shadow places each leaf above the floor and fish.
    s.fillStyle = 'rgba(31,91,88,.31)'
    s.beginPath()
    s.ellipse(1.8 * unit, 2.4 * unit, radius * 1.04, radius * 0.83, angle, 0, Math.PI * 2)
    s.fill()
    s.rotate(angle)
    const leaf = s.createLinearGradient(-radius, -radius, radius, radius)
    leaf.addColorStop(0, '#c6cc7c')
    leaf.addColorStop(0.45, '#a1b66a')
    leaf.addColorStop(1, '#648e59')
    s.fillStyle = leaf
    s.beginPath()
    s.moveTo(0, 0)
    s.ellipse(0, 0, radius, radius * 0.8, 0, 0.18, Math.PI * 2 - 0.18)
    s.closePath()
    s.fill()
    s.strokeStyle = 'rgba(220,222,146,.43)'
    s.lineWidth = Math.max(0.5, unit * 0.35)
    for (let i = 1; i < 8; i++) {
      const a = i / 8 * Math.PI * 2
      s.beginPath()
      s.moveTo(-radius * 0.09, 0)
      s.lineTo(Math.cos(a) * radius * 0.84, Math.sin(a) * radius * 0.66)
      s.stroke()
    }
    s.restore()
  }
  for (const [x, y, radius, angle] of [
    [0.19, 0.055, 5.8, 1.5], [0.29, 0.09, 5.2, 2.5], [0.24, 0.185, 6.7, -0.6],
    [0.34, 0.155, 5.4, 0.5], [0.16, 0.235, 4, 1],
    [0.19, 0.79, 6.5, 1.1], [0.27, 0.89, 5.4, -0.5], [0.17, 0.955, 6.8, 2.2],
    [0.085, 0.80, 4, 2], [0.30, 0.985, 4.5, -0.8],
    [0.91, 0.055, 5.8, 2.2], [0.985, 0.145, 5.1, -0.5], [0.99, 0.02, 4.1, 0.6],
  ]) lily(x * cols, y * rows, radius * unit, angle)

  function flower(x: number, y: number, pink: boolean, size = 1) {
    const u = unit * size
    s.fillStyle = 'rgba(48,92,75,.24)'
    s.beginPath()
    s.ellipse(x + u, y + 2 * u, 4.7 * u, 3 * u, 0, 0, Math.PI * 2)
    s.fill()
    for (let ring = 0; ring < 2; ring++) {
      const petals = ring ? 7 : 9
      for (let i = 0; i < petals; i++) {
        const a = i / petals * Math.PI * 2 + ring * 0.4
        s.fillStyle = pink ? (ring ? '#f4c3cc' : i % 2 ? '#d987a4' : '#e8a4ba') : (ring ? '#fff2d7' : i % 2 ? '#e6dfbd' : '#f7ebce')
        s.beginPath()
        s.ellipse(x + Math.cos(a) * (ring ? 1.1 : 2.1) * u, y + Math.sin(a) * (ring ? 0.8 : 1.6) * u, (ring ? 2.2 : 3) * u, (ring ? 0.8 : 1) * u, a, 0, Math.PI * 2)
        s.fill()
      }
    }
    s.fillStyle = '#e7be62'
    s.fillRect(Math.round(x - u), Math.round(y - u), Math.max(1, Math.round(2 * u)), Math.max(1, Math.round(2 * u)))
    s.fillStyle = '#fff0a4'
    s.fillRect(Math.round(x - u), Math.round(y - u), Math.max(1, Math.round(u)), Math.max(1, Math.round(u)))
  }
  flower(cols * 0.30, rows * 0.17, true)
  flower(cols * 0.235, rows * 0.86, true, 1.05)
  flower(cols * 0.92, rows * 0.075, false, 0.75)

  function maple(x: number, y: number, rotation: number, color: string) {
    s.save()
    s.translate(x, y)
    s.rotate(rotation)
    const u = unit * 0.7
    const points = [[0,-4.5],[1,-1.8],[3,-3],[2.5,-0.8],[4.6,-0.8],[2.5,0.8],[3.1,2.3],[1,1.8],[0,3.4],[-1,1.8],[-3.1,2.3],[-2.5,0.8],[-4.6,-0.8],[-2.5,-0.8],[-3,-3],[-1,-1.8]]
    s.fillStyle = 'rgba(37,91,83,.2)'
    s.fillRect(u, 1.7 * u, 5 * u, 3 * u)
    s.beginPath()
    points.forEach(([px, py], i) => i ? s.lineTo(px * u, py * u) : s.moveTo(px * u, py * u))
    s.closePath()
    s.fillStyle = color
    s.fill()
    s.strokeStyle = '#efb880'
    s.lineWidth = Math.max(0.5, unit * 0.35)
    s.beginPath()
    s.moveTo(0, -2.5 * u)
    s.lineTo(0, 5 * u)
    s.stroke()
    s.restore()
  }
  maple(cols * 0.14, rows * 0.265, -0.3, '#d47955')
  maple(cols * 0.83, rows * 0.075, 0.5, '#de8a68')
  maple(cols * 0.89, rows * 0.87, -0.5, '#d96f4f')
  maple(cols * 0.68, rows * 0.955, 1, '#cb8553')

  const maskPixels = m.getImageData(0, 0, cols, rows).data
  const causticMask = new Uint8Array(cols * rows)
  for (let i = 0; i < causticMask.length; i++) causticMask[i] = maskPixels[i * 4]
  return { pixels: new Uint32Array(g.getImageData(0, 0, cols, rows).data.buffer), surface, causticMask }
}
