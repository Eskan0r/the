import { hash2, koiPigment, type KoiFish } from './fish'

type Point = readonly [number, number]
type Color = readonly [number, number, number]
const eye: Color = [34, 42, 44]
const iris: Color = [222, 190, 126]
const glint: Color = [254, 250, 224]
function polygon(points: Point[]) {
  const xs = points.map(p => p[0]), ys = points.map(p => p[1])
  return { points, left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) }
}

const dorsal = polygon([[-5.6,-1.4], [-4.7,-1.9], [-2.3,-3.05], [-0.6,-3.85], [0.65,-4.65], [0.52,-3.75], [0.83,-2.7], [0,-2]])
const caudal = polygon([[-7.3,-0.55], [-8.8,-1.35], [-11.1,-3.25], [-12.6,-3.7], [-12.1,-2.65], [-10.65,-0.27], [-10.55,0.15], [-12.1,2.65], [-12.55,3.45], [-11.4,3.1], [-9,1.5], [-7.3,0.55]])
const pelvic = polygon([[-0.65,1.4], [-1.1,2.45], [-2.4,3.55], [-2.9,3.6], [-2.6,2.85], [-2.35,1.7]])
const anal = polygon([[-4.4,1.12], [-5.2,2.3], [-6.65,2.7], [-6.35,2.12], [-5.85,1.05]])
const pectoral = polygon([[3.6,0.98], [3.7,1.45], [2.8,2.9], [1.25,4], [0.5,4.08], [0.7,3.4], [1.7,1.95], [2.95,1.05]])

function inside(u: number, v: number, shape: ReturnType<typeof polygon>) {
  if (u < shape.left || u > shape.right || v < shape.top || v > shape.bottom) return false
  const { points } = shape
  let hit = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [x, y] = points[i], [prevX, prevY] = points[j]
    if ((y > v) !== (prevY > v) && u < x + (prevX - x) * (v - y) / (prevY - y)) hit = !hit
  }
  return hit
}

function rgba(color: Color, light = 1, alpha = 255, belly: Color = color, blend = 0) {
  const r = Math.min(255, Math.round((color[0] + (belly[0] - color[0]) * blend) * light))
  const g = Math.min(255, Math.round((color[1] + (belly[1] - color[1]) * blend) * light))
  const b = Math.min(255, Math.round((color[2] + (belly[2] - color[2]) * blend) * light))
  return (alpha << 24) | (b << 16) | (g << 8) | r
}

// Longitudinal section from the caudal peduncle to the koi's downturned mouth.
// Each station gives distance forward, height above the spine and depth below.
const outline = [
  [-8.3,0.48,0.48], [-6.9,0.68,0.72], [-4.8,1.55,1.35], [-2.2,2.35,1.95],
  [0.3,2.85,2.25], [2.4,2.95,2.32], [4.2,2.55,2.12], [5.7,1.95,1.83],
  [7.15,1.04,1.46], [8.05,0.38,1.12], [8.55,-0.2,0.74],
]

// Bake pigments and fin rays once. Per-frame work only projects these pixels
// through the live fish's spine and sculls the near pectoral fin at its joint.
export function createKoiSideView(fish: KoiFish, width: number, height: number) {
  const body = new Uint32Array(width * height), fin = new Uint32Array(body.length)
  const scale = width / 24
  const facing = Math.cos(fish.heading) >= 0 ? 1 : -1
  const { pal } = fish
  let station = 0
  for (let x = 0; x < width; x++) {
    const u = (x + 0.5 - width / 2) / scale - 2
    while (station < outline.length - 2 && u > outline[station + 1][0]) station++
    const a = outline[station], b = outline[station + 1]
    const t = (u - a[0]) / (b[0] - a[0])
    const top = a[1] + (b[1] - a[1]) * t, bottom = a[2] + (b[2] - a[2]) * t
    for (let y = 0; y < height; y++) {
      const v = (y + 0.5 - height / 2) / scale
      const p = y * width + x
      if (inside(u, v, pectoral)) {
        const ray = Math.cos(Math.atan2(v - 1, 3.6 - u) * 26)
        fin[p] = rgba(pal.fin, 0.89 + 0.07 * ray, 233)
      }
      if (u >= -8.3 && u <= 8.55 && v >= -top && v <= bottom) {
        const depth = (v + top) / (top + bottom)
        // Continue the dorsal pigment field around the curved, visible flank.
        const lateral = facing * (Math.max(0.3, top) * 2.1 * Math.sqrt(depth) + 0.6 * depth)
        const pigment = koiPigment(u, lateral, fish)
        const belly = Math.max(0, (depth - 0.6) / 0.4)
        let light = 0.96 + 0.065 * Math.sin(depth * Math.PI * 1.6) + 0.035 * hash2(x, y, fish.seed)
        if (v + top < 0.23 || bottom - v < 0.3) light *= 0.82
        // The curved operculum separates the smooth cheek from the flank.
        if (v > -1.55 && v < 1.38 && Math.abs(u - (3.88 + 0.3 * v * v)) < 0.14) light *= 0.76
        if (u > 7.15 && Math.abs(v - (0.72 - 0.12 * (u - 7.15))) < 0.13) light *= 0.56
        body[p] = rgba(pigment, light, 255, pal.base, 0.9 * belly * belly)
      } else if (inside(u, v, caudal) || inside(u, v, dorsal) || inside(u, v, pelvic) || inside(u, v, anal)) {
        const ray = u < -7.4 ? Math.cos(Math.atan2(v, -7.4 - u) * 21) : Math.cos((u - v * 0.35) * 8)
        body[p] = rgba(pal.fin, 0.9 + 0.08 * ray, 206)
      } else if (u > 7.15 && u < 8 && Math.abs(v - (1.18 + (8 - u) * 0.95)) < 0.13) {
        body[p] = rgba(pal.base, 0.68, 218)
      }
    }
  }

  // The lateral eye sees the course ahead with a foreshortened pupil. Turning
  // its gaze toward the camera brings the round pupil to the center of the iris.
  const eyeX = width / 2 + (6.36 + 2) * scale, eyeY = height / 2 - 0.49 * scale
  let lastGaze = -1
  function setGaze(gaze: number) {
    const pupilX = 0.39 * (1 - gaze)
    const pupilWidth = 0.27 + 0.18 * gaze
    for (let y = Math.max(0, Math.floor(eyeY - scale)); y < Math.min(height, eyeY + scale); y++) {
      const ey = (y + 0.5 - eyeY) / scale
      for (let x = Math.max(0, Math.floor(eyeX - scale)); x < Math.min(width, eyeX + scale); x++) {
        const ex = (x + 0.5 - eyeX) / scale
        const socket = (ex / 0.88) ** 2 + (ey / 0.68) ** 2
        if (socket > 1) continue
        let color = socket > 0.80 ? rgba(eye, 1.38) : rgba(iris, 1.01 - ey * 0.12)
        if (((ex - pupilX) / pupilWidth) ** 2 + (ey / 0.45) ** 2 < 1) color = rgba(eye)
        if (Math.abs(ex - pupilX + 0.14) < 0.125 && Math.abs(ey + 0.18) < 0.125) color = rgba(glint)
        body[y * width + x] = color
      }
    }
    lastGaze = gaze
  }

  const finShift = new Int16Array(height)
  return (output: Uint32Array, gaze = 0) => {
    if (gaze !== lastGaze) setGaze(gaze)
    const tail = fish.tail
    const last = tail.x.length - 1
    const scull = Math.sin(tail.phase - 0.6) * 0.19
    for (let y = 0; y < height; y++) finShift[y] = Math.round((y - height / 2 - scale) * scull)
    for (let x = 0; x < width; x++) {
      const u = (x + 0.5 - width / 2) / scale - 2
      const at = Math.max(0, Math.min(last, (3.6 - u) * last / 16.2))
      const i = Math.min(last - 1, Math.floor(at)), f = at - i
      const depth = (tail.y[i] + (tail.y[i + 1] - tail.y[i]) * f) * facing
      const along = tail.x[i] + (tail.x[i + 1] - tail.x[i]) * f
      const foreshortening = along - (3.6 - at * 16.2 / last)
      // The lateral tail beat travels mostly toward and away from this camera.
      const sourceX = x - Math.round((foreshortening + depth * 0.42) * scale)
      const lift = Math.round(depth * 0.29 * scale)
      const screenX = facing > 0 ? x : width - 1 - x
      for (let y = 0; y < height; y++) {
        const sourceY = y - lift
        const base = sourceX >= 0 && sourceX < width && sourceY >= 0 && sourceY < height
          ? body[sourceY * width + sourceX] : 0
        const finX = x - finShift[y]
        const nearFin = finX >= 0 && finX < width ? fin[y * width + finX] : 0
        output[y * width + screenX] = nearFin || base
      }
    }
  }
}
