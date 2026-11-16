// A cached, pixel-scale garden pond. All scenery is drawn locally, without
// external textures, so it stays aligned with the koi at every display density.
export function createPond(cols: number, rows: number) {
  const bed = document.createElement('canvas')
  const surface = document.createElement('canvas')
  bed.width = surface.width = cols
  bed.height = surface.height = rows
  const g = bed.getContext('2d')!
  const s = surface.getContext('2d')!
  let seed = 72841
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0
    return (seed >>> 0) / 4294967296
  }
  const unit = Math.min(cols / 160, rows / 100)
  const water = g.createLinearGradient(0, 0, cols, rows)
  water.addColorStop(0, '#233e3c')
  water.addColorStop(0.5, '#152e32')
  water.addColorStop(1, '#2f4540')
  g.fillStyle = water
  g.fillRect(0, 0, cols, rows)

  // Fine gravel is quieter in the deep, open middle of the pond.
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const edge = Math.pow(Math.abs(x / cols - 0.5) * 2, 2)
    const n = random()
    g.fillStyle = n > 0.53 ? `rgba(164,161,123,${0.025 + edge * 0.12})` : `rgba(4,20,23,${n * 0.25})`
    g.fillRect(x, y, n > 0.95 ? 2 : 1, 1)
  }

  function stone(x: number, y: number, radius: number) {
    const aspect = 0.65 + random() * 0.4
    const rotation = random() * Math.PI
    g.save()
    g.translate(x, y)
    g.rotate(rotation)
    g.fillStyle = 'rgba(3,17,20,0.5)'
    g.beginPath()
    g.ellipse(1.5, 2.5, radius * 1.12, radius * aspect, 0, 0, Math.PI * 2)
    g.fill()
    const shade = g.createLinearGradient(-radius, -radius, radius, radius)
    const warm = random() > 0.55
    shade.addColorStop(0, warm ? '#717568' : '#637773')
    shade.addColorStop(0.45, warm ? '#4c5b51' : '#405956')
    shade.addColorStop(1, '#243b3a')
    g.fillStyle = shade
    g.beginPath()
    for (let i = 0; i <= 16; i++) {
      const a = i / 16 * Math.PI * 2
      const r = radius * (0.9 + random() * 0.14)
      const px = Math.cos(a) * r, py = Math.sin(a) * r * aspect
      if (!i) g.moveTo(px, py)
      else g.lineTo(px, py)
    }
    g.closePath()
    g.fill()
    // Broken mineral highlights and moss, never a smooth vector outline.
    for (let i = 0; i < radius * radius * 1.7; i++) {
      const px = (random() * 2 - 1) * radius
      const py = (random() * 2 - 1) * radius * aspect
      if (px * px / (radius * radius) + py * py / (radius * radius * aspect * aspect) > 0.78) continue
      g.fillStyle = random() > 0.65 ? 'rgba(130,148,106,0.35)' : 'rgba(15,35,32,0.18)'
      g.fillRect(Math.floor(px), Math.floor(py), 1, 1)
    }
    g.restore()
  }

  // Loose river pebbles show through the shallows without filling the swim space.
  g.globalAlpha = 0.35
  for (let i = 0; i < cols * rows / 100; i++) {
    const x = random() * cols, y = random() * rows
    const shallows = Math.abs(x / cols - 0.5) * 2 + y / rows * 0.3
    if (random() > shallows * 0.65) continue
    stone(x, y, (0.65 + random() * 1.6) * unit)
  }
  g.globalAlpha = 1

  // Asymmetric rock shelves frame the water, with room for fish in the centre.
  for (const [cx, cy, size] of [[0.02, 0.12, 1], [0.98, 0.83, 1.2], [0.13, 1.02, 0.85]]) {
    for (let i = 0; i < 24; i++) {
      const a = random() * Math.PI * 2
      const r = Math.sqrt(random()) * 21 * unit * size
      stone(cx * cols + Math.cos(a) * r, cy * rows + Math.sin(a) * r * 0.75, (2 + random() * 6) * unit * size)
    }
  }

  function grass(x: number, y: number, flip: number) {
    for (let i = 0; i < 20; i++) {
      const height = (5 + random() * 14) * unit
      const lean = (random() - 0.3) * height * flip
      g.strokeStyle = ['#345847', '#41674d', '#294d41', '#537155'][i % 4]
      g.lineWidth = Math.max(0.55, unit * 0.7)
      g.beginPath()
      g.moveTo(x + (random() - 0.5) * 6 * unit, y)
      g.quadraticCurveTo(x + lean * 0.15, y - height * 0.7, x + lean, y - height)
      g.stroke()
    }
  }
  grass(cols * 0.025, rows * 0.41, 1)
  grass(cols * 0.94, rows * 0.99, -1)
  grass(cols * 0.19, rows * 1.03, 1)

  function lily(x: number, y: number, radius: number, angle: number) {
    s.save()
    s.translate(x, y)
    s.rotate(angle)
    s.fillStyle = 'rgba(3,20,24,0.45)'
    s.beginPath()
    s.ellipse(1.7 * unit, 2.8 * unit, radius, radius * 0.8, 0, 0, Math.PI * 2)
    s.fill()
    const leaf = s.createLinearGradient(-radius, -radius, radius, radius)
    leaf.addColorStop(0, '#78915b')
    leaf.addColorStop(0.45, '#4f764c')
    leaf.addColorStop(1, '#2b5340')
    s.fillStyle = leaf
    s.beginPath()
    s.moveTo(0, 0)
    s.ellipse(0, 0, radius, radius * 0.8, 0, 0.22, Math.PI * 2 - 0.22)
    s.closePath()
    s.fill()
    s.strokeStyle = 'rgba(163,181,108,0.26)'
    s.lineWidth = 0.45
    for (let i = 1; i < 8; i++) {
      const a = i / 8 * Math.PI * 2
      s.beginPath()
      s.moveTo(0, 0)
      s.lineTo(Math.cos(a) * radius * 0.85, Math.sin(a) * radius * 0.65)
      s.stroke()
    }
    s.restore()
  }
  for (const [x, y, radius, angle] of [
    [0.81, 0.04, 7, 1.5], [0.9, 0.11, 9, 2.7], [0.98, 0.025, 8, 0.4],
    [0.98, 0.23, 6, 3.6], [0.76, 0.13, 5, -0.7],
    [0.015, 0.77, 8, 0.8], [0.075, 0.88, 6, -0.5], [0.01, 0.97, 7, 2],
  ]) lily(x * cols, y * rows, radius * unit, angle)

  // A small ivory water lily nestled into the upper cluster.
  const fx = cols * 0.87, fy = rows * 0.055
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2
    s.fillStyle = i % 2 ? '#a6b6a1' : '#d0ceaf'
    s.beginPath()
    s.ellipse(fx + Math.cos(a) * 1.9 * unit, fy + Math.sin(a) * 1.5 * unit, 2.5 * unit, 0.95 * unit, a, 0, Math.PI * 2)
    s.fill()
  }
  s.fillStyle = '#bca96b'
  s.fillRect(fx - unit, fy - unit, 2 * unit, 2 * unit)
  return { pixels: new Uint32Array(g.getImageData(0, 0, cols, rows).data.buffer), surface }
}
