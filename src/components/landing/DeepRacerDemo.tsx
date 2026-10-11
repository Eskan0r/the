import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../../lib/motion/gsap'

// DeepRacer demo: top-down stadium track, one car running laps with a small
// arcade drift model (kinematic bicycle + exponential lateral-grip decay, the
// approach used by most "feels right" top-down racers). The rear is heavy, so
// the tail swings wide through corners and the car slides before it hooks up.

const CAR = '#ff9f1c'
const TAU = Math.PI * 2

function wrapAngle(a: number): number {
a %= TAU
if (a > Math.PI) a -= TAU
if (a < -Math.PI) a += TAU
return a
}

export default function DeepRacerDemo({ active = true }: { active?: boolean }) {
const canvasRef = useRef<HTMLCanvasElement | null>(null)

useEffect(() => {
const canvas = canvasRef.current
if (!canvas) return
const ctx = canvas.getContext('2d')
if (!ctx) return

const reduced = prefersReducedMotion()
const dpr = Math.min(window.devicePixelRatio || 1, 2)
const w = canvas.clientWidth || 480
const h = Math.round((w * 10) / 16)
canvas.width = Math.round(w * dpr)
canvas.height = Math.round(h * dpr)
ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

// Track: two straights joined by two semicircle ends (a stadium oval).
const cx = w / 2
const cy = h / 2 + 6
const R = Math.min(w, h) * 0.26
const L = w * 0.24
const road = Math.max(30, R * 0.62)
const straight = 2 * L
const arc = Math.PI * R
const lap = 2 * straight + 2 * arc

const centerAt = (s: number): [number, number] => {
let d = ((s % lap) + lap) % lap
if (d < straight) return [cx - L + d, cy - R]
d -= straight
if (d < arc) {
const a = -Math.PI / 2 + d / R
return [cx + L + R * Math.cos(a), cy + R * Math.sin(a)]
}
d -= arc
if (d < straight) return [cx + L - d, cy + R]
d -= straight
const a = Math.PI / 2 + d / R
return [cx - L + R * Math.cos(a), cy + R * Math.sin(a)]
}

// Racing line: run wide on the straights, cut toward the center at apexes.
const OUT = Math.min(11, road * 0.2)
const IN = Math.min(12, road * 0.22)
const apex1 = straight + arc / 2
const apex2 = 2 * straight + arc + arc / 2
const BLEND = arc * 1.15
const wrapDist = (s: number, a: number) => {
const d = Math.abs((((s - a) % lap) + lap) % lap)
return Math.min(d, lap - d)
}
const cornerBump = (s: number) => {
const b1 =
wrapDist(s, apex1) < BLEND ? Math.cos((Math.PI * wrapDist(s, apex1)) / (2 * BLEND)) ** 2 : 0
const b2 =
wrapDist(s, apex2) < BLEND ? Math.cos((Math.PI * wrapDist(s, apex2)) / (2 * BLEND)) ** 2 : 0
return Math.max(b1, b2)
}
const lateral = (s: number) => -OUT + (OUT + IN) * cornerBump(s)
const linePoint = (s: number): [number, number] => {
const [x, y] = centerAt(s)
const dx = cx - x
const dy = cy - y
const len = Math.hypot(dx, dy) || 1
const o = lateral(s)
return [x + (dx / len) * o, y + (dy / len) * o]
}
const V0 = lap / 5
const speedAt = (s: number) => V0 * (1 - 0.45 * cornerBump(s))

// Driving model. Tuned so the car drifts ~20 deg through corners while
// staying inside the track (max lateral excursion ~half the road width).
const P = {
maxSteer: 0.45,
wheelbase: 34,
accel: 3.4,
grip: 4.5,
kp: 3.8,
steerRate: 7,
ldK: 0.32,
ldMin: 26,
ldMax: 60,
}

const car = { x: 0, y: 0, vx: 0, vy: 0, yaw: 0, steer: 0, s: 0 }
const reset = () => {
;[car.x, car.y] = linePoint(0)
const [ax, ay] = linePoint(-1.6)
const [bx, by] = linePoint(1.6)
car.yaw = Math.atan2(by - ay, bx - ax)
car.vx = car.vy = car.steer = car.s = 0
}
reset()

const step = (dt: number) => {
const fx0 = Math.cos(car.yaw)
const fy0 = Math.sin(car.yaw)
let vLong = car.vx * fx0 + car.vy * fy0

const target = speedAt(car.s)
const ld = Math.max(P.ldMin, Math.min(P.ldMax, vLong * P.ldK))
const [lx, ly] = linePoint(car.s + ld)
const desired = Math.atan2(ly - car.y, lx - car.x)
const err = wrapAngle(desired - car.yaw)
const steerTarget = Math.max(-P.maxSteer, Math.min(P.maxSteer, err * P.kp))
car.steer += (steerTarget - car.steer) * Math.min(1, P.steerRate * dt)

const omega = (vLong / P.wheelbase) * Math.tan(car.steer)
car.yaw += omega * dt

// world velocity is unchanged by the turn; re-decompose in the new frame
const fx = Math.cos(car.yaw)
const fy = Math.sin(car.yaw)
const rx = -Math.sin(car.yaw)
const ry = Math.cos(car.yaw)
vLong = car.vx * fx + car.vy * fy
let vLat = car.vx * rx + car.vy * ry

vLong += (target - vLong) * P.accel * dt
vLat *= Math.exp(-P.grip * dt) // lateral grip: slow decay = long slides

car.vx = fx * vLong + rx * vLat
car.vy = fy * vLong + ry * vLat
car.x += car.vx * dt
car.y += car.vy * dt
car.s += vLong * dt
}

const tracePath = () => {
ctx.beginPath()
const [sx, sy] = centerAt(0)
ctx.moveTo(sx, sy)
for (let s = lap / 240; s < lap; s += lap / 240) {
const [x, y] = centerAt(s)
ctx.lineTo(x, y)
}
ctx.closePath()
}

// drift trail (skid marks where the rear slides)
const trail: number[][] = []

const draw = () => {
ctx.clearRect(0, 0, w, h)
ctx.fillStyle = '#10151b'
ctx.fillRect(0, 0, w, h)

ctx.fillStyle = 'rgba(255,255,255,0.05)'
for (let i = 0; i < 40; i += 1) {
ctx.fillRect(((i * 197.3) % w + w) % w, ((i * 311.7) % h + h) % h, 2, 2)
}

tracePath()
ctx.strokeStyle = '#e8e8e8'
ctx.lineWidth = road + 8
ctx.stroke()
tracePath()
ctx.strokeStyle = '#2b323b'
ctx.lineWidth = road
ctx.stroke()
tracePath()
ctx.strokeStyle = 'rgba(255,255,255,0.55)'
ctx.lineWidth = 2
ctx.setLineDash([10, 12])
ctx.stroke()
ctx.setLineDash([])

// start / finish checks
const [fx, fy] = centerAt(0)
const sq = 6
const cols = 3
const rows = Math.max(2, Math.floor(road / sq))
for (let r = 0; r < rows; r += 1) {
for (let k = 0; k < cols; k += 1) {
ctx.fillStyle = (r + k) % 2 === 0 ? '#111111' : '#f5f5f5'
ctx.fillRect(fx + (k - cols / 2) * sq, fy - road / 2 + r * sq, sq, sq)
}
}

// skid trail
if (trail.length > 1) {
ctx.strokeStyle = 'rgba(20,20,20,0.4)'
ctx.lineWidth = 3
ctx.lineCap = 'round'
ctx.beginPath()
ctx.moveTo(trail[0][0], trail[0][1])
for (let i = 1; i < trail.length; i += 1) ctx.lineTo(trail[i][0], trail[i][1])
ctx.stroke()
ctx.lineCap = 'butt'
}

// car
const fx2 = Math.cos(car.yaw)
const fy2 = Math.sin(car.yaw)
const vLong = car.vx * fx2 + car.vy * fy2
const vLat = car.vx * -fy2 + car.vy * fx2
const slip = Math.atan2(vLat, Math.abs(vLong) + 1e-6)
const roll = Math.max(-0.25, Math.min(0.25, slip * 0.5))

ctx.save()
ctx.translate(car.x, car.y)
ctx.rotate(car.yaw)
const bl = 26
const bw = 14

ctx.fillStyle = 'rgba(0,0,0,0.35)'
ctx.fillRect(-bl / 2 + 2, -bw / 2 + 3, bl, bw)

ctx.fillStyle = '#141414'
ctx.fillRect(-bl * 0.42, -bw / 2 - 2, 6, 4)
ctx.fillRect(-bl * 0.42, bw / 2 - 2, 6, 4)
for (const side of [-1, 1]) {
ctx.save()
ctx.translate(bl * 0.28, side * (bw / 2))
ctx.rotate(car.steer)
ctx.fillRect(-3, -2, 6, 4)
ctx.restore()
}

// body with a little roll so weight transfer reads
ctx.rotate(roll)
ctx.fillStyle = CAR
ctx.fillRect(-bl / 2, -bw / 2, bl, bw)
ctx.fillStyle = '#1a1a1a'
ctx.fillRect(-bl * 0.18, -bw / 2 + 2, bl * 0.34, bw - 4)
ctx.fillStyle = '#fff'
ctx.fillRect(bl / 2 - 3, -bw / 2 + 1, 3, bw / 2 - 2)
ctx.fillRect(bl / 2 - 3, 1, 3, bw / 2 - 2)
ctx.restore()

const lapNum = Math.floor(car.s / lap) + 1
const kph = Math.min(999, Math.round(Math.hypot(car.vx, car.vy) * 0.9))
ctx.font = "600 12px 'JetBrains Mono', monospace"
ctx.fillStyle = 'rgba(255,255,255,0.85)'
ctx.textAlign = 'left'
ctx.textBaseline = 'top'
ctx.fillText(`LAP ${Math.min(lapNum, 99)}  ${kph} KM/H`, 12, 10)
}

if (false && reduced) {
// settle the car on the line, then draw one static frame
for (let i = 0; i < 60; i += 1) step(1 / 120)
draw()
return
}

let raf = 0
let running = true
let last = performance.now()
    const frame = (now: number) => {
if (!running) return
raf = requestAnimationFrame(frame)
const dt = Math.min(Math.max((now - last) / 1000, 0), 1 / 30)
last = now

// fixed-ish substeps keep the integration stable at any frame rate
const sub = Math.max(1, Math.ceil(dt / (1 / 120)))
const h = dt / sub
for (let i = 0; i < sub; i += 1) step(h)

const fx2 = Math.cos(car.yaw)
const fy2 = Math.sin(car.yaw)
const vLat = car.vx * -fy2 + car.vy * fx2
if (Math.abs(vLat) > 14) {
trail.push([car.x, car.y])
if (trail.length > 90) trail.shift()
} else if (trail.length) {
trail.shift()
}

draw()
}
raf = requestAnimationFrame(frame)
return () => {
running = false
cancelAnimationFrame(raf)
}
}, [active])

return <canvas ref={canvasRef} className="ticker-demo-canvas" aria-hidden="true" />
}
