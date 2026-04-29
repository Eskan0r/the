import { useEffect, useRef } from 'react'
import { useDesktopStore } from '../../store/desktopStore'

const G = 0.4
const BLACK_HOLE_MASS = 8000
const DESPAWN_MARGIN = 300

interface Vec2 { x: number; y: number }

interface SpaceObject {
  id: number
  type: 'asteroid' | 'planet' | 'debris' | 'cow' | 'meteor' | 'earth' | 'moon'
  pos: Vec2
  vel: Vec2
  shape: Vec2[]
  rotation: number
  rotationSpeed: number
  opacity: number
  size: number
  baseSize: number
  mass: number
  swallowed: boolean
  trail?: Vec2[]
  parentId?: number
  minDistFromParent?: number
}

interface BlackHole {
  pos: Vec2
  radius: number
  ringPhase: number
}

interface Satellite {
  angle: number
  orbitRadius: number
  orbitSpeed: number
  blackHoleIndex: number
}

interface Star {
  x: number; y: number
  size: number
  opacity: number
  baseOpacity: number
  twinkleSpeed: number
  twinklePhase: number
  vx: number; vy: number
  warm: boolean
  inEvent: boolean
}

interface SupernovaEvent {
  type: 'supernova'
  phase: 'approaching' | 'flash' | 'ring' | 'done'
  cx: number; cy: number
  s1x: number; s1y: number; s1idx: number
  s2x: number; s2y: number; s2idx: number
  ox1: number; oy1: number
  ox2: number; oy2: number
  initialRadius: number
  initialAngle1: number
  t: number
  radius: number
  flashOpacity: number
}

interface ConstellationEvent {
  type: 'constellation'
  phase: 'fadein' | 'hold' | 'fadeout' | 'done'
  starPositions: { x: number; y: number }[]
  edges: [number, number][]
  opacity: number
  t: number
}

type StarEvent = SupernovaEvent | ConstellationEvent

interface CloudParticle {
  ox: number
  oy: number
  r: number
  baseOpacity: number
  wobblePhase: number
  wobbleSpeed: number
  wobbleAmpX: number
  wobbleAmpY: number
}

interface GaseousCloud {
  id: number
  pos: Vec2
  vel: Vec2
  particles: CloudParticle[]
  radius: number
  globalOpacity: number
  phase: 'fadein' | 'drifting' | 'fadeout'
  phaseT: number
  driftFrames: number
  colorRgb: string
  accentFraction: number
}

let idCounter = 0

const CONTINENTS: Vec2[][] = [
  [
    { x: -0.65, y: -0.75 }, { x: -0.35, y: -0.70 }, { x: -0.25, y: -0.45 },
    { x: -0.40, y: -0.10 }, { x: -0.55, y: 0.15 },  { x: -0.50, y: 0.55 },
    { x: -0.65, y: 0.75 },  { x: -0.78, y: 0.50 },  { x: -0.72, y: 0.10 },
    { x: -0.80, y: -0.30 }, { x: -0.70, y: -0.60 },
  ],
  [
    { x: -0.05, y: -0.75 }, { x: 0.30, y: -0.70 }, { x: 0.45, y: -0.45 },
    { x: 0.30, y: -0.20 }, { x: 0.40, y: 0.10 },   { x: 0.35, y: 0.50 },
    { x: 0.15, y: 0.80 },  { x: -0.05, y: 0.65 },  { x: -0.10, y: 0.25 },
    { x: 0.05, y: 0.00 },  { x: -0.08, y: -0.40 },
  ],
  [
    { x: 0.30, y: -0.70 }, { x: 0.75, y: -0.55 }, { x: 0.85, y: -0.20 },
    { x: 0.70, y: 0.10 },  { x: 0.45, y: 0.05 },  { x: 0.30, y: -0.20 },
  ],
  [
    { x: 0.50, y: 0.50 }, { x: 0.72, y: 0.42 }, { x: 0.80, y: 0.62 },
    { x: 0.62, y: 0.78 }, { x: 0.44, y: 0.70 },
  ],
]

const CLOUD_STATIC_COLORS = [
  '70,130,255',   // blue
  '140,70,255',   // purple
  '55,205,185',   // teal
  '255,140,80',   // warm amber
]

function massFromSize(size: number): number {
  return size * size * 0.08
}

function makeCircleShape(r: number, pts = 32): Vec2[] {
  return Array.from({ length: pts }, (_, i) => {
    const a = (i / pts) * Math.PI * 2
    return { x: Math.cos(a) * r, y: Math.sin(a) * r }
  })
}

function makeAsteroidShape(size: number): Vec2[] {
  const pts = 6 + Math.floor(Math.random() * 5)
  return Array.from({ length: pts }, (_, i) => {
    const a = (i / pts) * Math.PI * 2
    const r = size * (0.55 + Math.random() * 0.45)
    return { x: Math.cos(a) * r, y: Math.sin(a) * r }
  })
}

function randomEdgeSpawn(W: number, H: number, speed = 0.4 + Math.random() * 0.8): { pos: Vec2; vel: Vec2 } {
  const edge = Math.floor(Math.random() * 4)
  let pos: Vec2
  switch (edge) {
    case 0:  pos = { x: Math.random() * W, y: -DESPAWN_MARGIN }; break
    case 1:  pos = { x: W + DESPAWN_MARGIN, y: Math.random() * H }; break
    case 2:  pos = { x: Math.random() * W, y: H + DESPAWN_MARGIN }; break
    default: pos = { x: -DESPAWN_MARGIN, y: Math.random() * H }; break
  }
  const tx = W * (0.2 + Math.random() * 0.6)
  const ty = H * (0.2 + Math.random() * 0.6)
  const dx = tx - pos.x
  const dy = ty - pos.y
  const len = Math.sqrt(dx * dx + dy * dy)
  return { pos, vel: { x: (dx / len) * speed, y: (dy / len) * speed } }
}

function randomAngleSpawn(W: number, H: number): { pos: Vec2; vel: Vec2 } {
  const edge = Math.floor(Math.random() * 4)
  let pos: Vec2
  switch (edge) {
    case 0:  pos = { x: Math.random() * W, y: -DESPAWN_MARGIN }; break
    case 1:  pos = { x: W + DESPAWN_MARGIN, y: Math.random() * H }; break
    case 2:  pos = { x: Math.random() * W, y: H + DESPAWN_MARGIN }; break
    default: pos = { x: -DESPAWN_MARGIN, y: Math.random() * H }; break
  }
  const angle = Math.random() * Math.PI * 2
  const speed = 0.3 + Math.random() * 0.9
  return { pos, vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed } }
}

function makeAsteroid(W: number, H: number): SpaceObject {
  const { pos, vel } = Math.random() < 0.5 ? randomAngleSpawn(W, H) : randomEdgeSpawn(W, H)
  const size = 7 + Math.random() * 16
  return {
    id: idCounter++, type: 'asteroid', pos, vel,
    shape: makeAsteroidShape(size),
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.025,
    opacity: 0.5 + Math.random() * 0.4,
    size, baseSize: size, mass: massFromSize(size), swallowed: false,
  }
}

function makeRandomAsteroid(): SpaceObject {
  const angle = Math.random() * Math.PI * 2
  const speed = 1.5 + Math.random() * 3.5
  const pos: Vec2 = {
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
  }
  const size = 7 + Math.random() * 16
  return {
    id: idCounter++, type: 'asteroid',
    pos,
    vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
    shape: makeAsteroidShape(size),
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.025,
    opacity: 0.5 + Math.random() * 0.4,
    size, baseSize: size, mass: massFromSize(size), swallowed: false,
  }
}

function makePlanetWithMoon(W: number, H: number): SpaceObject[] {
  const { pos, vel } = randomEdgeSpawn(W, H)
  const size = 18 + Math.random() * 24
  const hasMoon = Math.random() < 0.5
  const hasRing = !hasMoon && size > 28

  const planet: SpaceObject = {
    id: idCounter++, type: 'planet', pos: { ...pos },
    vel: { x: vel.x * 0.55, y: vel.y * 0.55 },
    shape: makeCircleShape(size),
    rotation: 0, rotationSpeed: 0.003,
    opacity: 0.45 + Math.random() * 0.3,
    size, baseSize: size, mass: massFromSize(size), swallowed: false,
  }
  ;(planet as any).hasRing = hasRing

  if (!hasMoon) return [planet]

  const orbitRadius = size * (1.8 + Math.random() * 1.2)
  const moonSize = size * (0.18 + Math.random() * 0.2)
  const angle = Math.random() * Math.PI * 2
  const direction = Math.random() < 0.5 ? 1 : -1
  const orbitalSpeed = Math.sqrt((G * planet.mass * 300) / orbitRadius) * direction

  const moon: SpaceObject = {
    id: idCounter++, type: 'moon',
    pos: {
      x: pos.x + Math.cos(angle) * orbitRadius,
      y: pos.y + Math.sin(angle) * orbitRadius,
    },
    vel: {
      x: planet.vel.x + Math.cos(angle + Math.PI / 2) * orbitalSpeed,
      y: planet.vel.y + Math.sin(angle + Math.PI / 2) * orbitalSpeed,
    },
    shape: makeCircleShape(moonSize),
    rotation: 0, rotationSpeed: 0.005,
    opacity: planet.opacity * 0.8,
    size: moonSize, baseSize: moonSize,
    mass: massFromSize(moonSize), swallowed: false,
    parentId: planet.id,
    minDistFromParent: size + moonSize + 4,
  }

  return [planet, moon]
}

function makeEarth(W: number, H: number): SpaceObject[] {
  const { pos, vel } = randomEdgeSpawn(W, H)
  const size = 24 + Math.random() * 10
  const earth: SpaceObject = {
    id: idCounter++, type: 'earth', pos: { ...pos },
    vel: { x: vel.x * 0.45, y: vel.y * 0.45 },
    shape: makeCircleShape(size),
    rotation: 0, rotationSpeed: 0.002,
    opacity: 0.55, size, baseSize: size, mass: massFromSize(size), swallowed: false,
  }

  const orbitRadius = size * 2.2
  const moonSize = size * 0.27
  const angle = Math.random() * Math.PI * 2
  const orbitalSpeed = Math.sqrt((G * earth.mass * 300) / orbitRadius)

  const moon: SpaceObject = {
    id: idCounter++, type: 'moon',
    pos: {
      x: pos.x + Math.cos(angle) * orbitRadius,
      y: pos.y + Math.sin(angle) * orbitRadius,
    },
    vel: {
      x: earth.vel.x + Math.cos(angle + Math.PI / 2) * orbitalSpeed,
      y: earth.vel.y + Math.sin(angle + Math.PI / 2) * orbitalSpeed,
    },
    shape: makeCircleShape(moonSize),
    rotation: 0, rotationSpeed: 0.004,
    opacity: 0.5, size: moonSize, baseSize: moonSize,
    mass: massFromSize(moonSize), swallowed: false,
    parentId: earth.id,
    minDistFromParent: size + moonSize + 4,
  }

  return [earth, moon]
}

function makeMeteor(W: number, H: number): SpaceObject {
  const speed = 3.5 + Math.random() * 3.5
  const { pos, vel } = randomEdgeSpawn(W, H, speed)
  const size = 3 + Math.random() * 4
  return {
    id: idCounter++, type: 'meteor', pos, vel,
    shape: makeAsteroidShape(size),
    rotation: Math.atan2(vel.y, vel.x),
    rotationSpeed: 0, opacity: 0.85,
    size, baseSize: size, mass: massFromSize(size) * 0.1, swallowed: false,
    trail: [],
  }
}

function makeDebrisGroup(W: number, H: number): SpaceObject[] {
  const count = 3 + Math.floor(Math.random() * 5)
  const { pos: origin, vel: baseVel } = randomEdgeSpawn(W, H)
  const slowVel = { x: baseVel.x * 0.2, y: baseVel.y * 0.2 }
  const spread = 50 + Math.random() * 60
  return Array.from({ length: count }, () => {
    const size = 2 + Math.random() * 5
    return {
      id: idCounter++, type: 'debris' as const,
      pos: {
        x: origin.x + (Math.random() - 0.5) * spread,
        y: origin.y + (Math.random() - 0.5) * spread,
      },
      vel: {
        x: slowVel.x + (Math.random() - 0.5) * 0.15,
        y: slowVel.y + (Math.random() - 0.5) * 0.15,
      },
      shape: [
        { x: 0, y: -size },
        { x: size * 0.8, y: size * 0.6 },
        { x: -size * 0.8, y: size * 0.6 },
      ],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.01,
      opacity: 0.2 + Math.random() * 0.25,
      size, baseSize: size, mass: massFromSize(size) * 0.05, swallowed: false,
    }
  })
}

function makeCow(W: number, H: number): SpaceObject {
  const { pos, vel } = randomEdgeSpawn(W, H)
  const size = 28
  return {
    id: idCounter++, type: 'cow', pos,
    vel: { x: vel.x * 0.5, y: vel.y * 0.5 },
    shape: [
      { x: -18, y: -8 }, { x: -12, y: -14 }, { x: 0, y: -15 }, { x: 12, y: -14 },
      { x: 18, y: -8 }, { x: 18, y: 4 }, { x: 12, y: 8 }, { x: 10, y: 8 },
      { x: 10, y: 18 }, { x: 6, y: 18 }, { x: 6, y: 8 }, { x: -6, y: 8 },
      { x: -6, y: 18 }, { x: -10, y: 18 }, { x: -10, y: 8 }, { x: -18, y: 4 },
      { x: -18, y: -8 }, { x: -24, y: -10 }, { x: -28, y: -6 }, { x: -28, y: 2 },
      { x: -22, y: 4 }, { x: -18, y: 4 },
    ],
    rotation: Math.random() * Math.PI * 2, rotationSpeed: 0.008,
    opacity: 0.7, size, baseSize: size, mass: massFromSize(size) * 0.3, swallowed: false,
  }
}

function spawnCollisionDebris(pos: Vec2, vel: Vec2): SpaceObject[] {
  return Array.from({ length: 6 + Math.floor(Math.random() * 6) }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 0.5 + Math.random() * 2.5
    const size = 2 + Math.random() * 6
    return {
      id: idCounter++, type: 'debris' as const,
      pos: { x: pos.x + (Math.random() - 0.5) * 10, y: pos.y + (Math.random() - 0.5) * 10 },
      vel: {
        x: vel.x * 0.3 + Math.cos(angle) * speed,
        y: vel.y * 0.3 + Math.sin(angle) * speed,
      },
      shape: [
        { x: 0, y: -size },
        { x: size * 0.8, y: size * 0.6 },
        { x: -size * 0.8, y: size * 0.6 },
      ],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.04,
      opacity: 0.8, size, baseSize: size, mass: massFromSize(size) * 0.05, swallowed: false,
    }
  })
}

function isOffscreen(pos: Vec2, W: number, H: number): boolean {
  return pos.x < -DESPAWN_MARGIN * 2 || pos.x > W + DESPAWN_MARGIN * 2 ||
    pos.y < -DESPAWN_MARGIN * 2 || pos.y > H + DESPAWN_MARGIN * 2
}

function makeStars(W: number, H: number): Star[] {
  return Array.from({ length: 180 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    size: 0.35 + Math.random() * 1.9,
    opacity: Math.random(),
    baseOpacity: 0.18 + Math.random() * 0.58,
    twinkleSpeed: 0.004 + Math.random() * 0.022,
    twinklePhase: Math.random() * Math.PI * 2,
    vx: (Math.random() - 0.5) * 0.045,
    vy: (Math.random() - 0.5) * 0.045,
    warm: Math.random() < 0.25,
    inEvent: false,
  }))
}

function makeGaseousCloud(W: number, H: number): GaseousCloud {
  const big = Math.random() < 0.28
  const radius = big ? 160 + Math.random() * 90 : 75 + Math.random() * 65
  const count  = big ? 60 + Math.floor(Math.random() * 22) : 32 + Math.floor(Math.random() * 20)

  const edge = Math.floor(Math.random() * 4)
  let pos: Vec2
  const speed = 0.12 + Math.random() * 0.22
  switch (edge) {
    case 0:  pos = { x: Math.random() * W, y: -radius * 0.6 }; break
    case 1:  pos = { x: W + radius * 0.6, y: Math.random() * H }; break
    case 2:  pos = { x: Math.random() * W, y: H + radius * 0.6 }; break
    default: pos = { x: -radius * 0.6, y: Math.random() * H }; break
  }

  const tx = W * (0.15 + Math.random() * 0.7)
  const ty = H * (0.15 + Math.random() * 0.7)
  const dx = tx - pos.x, dy = ty - pos.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const vel: Vec2 = { x: (dx / len) * speed, y: (dy / len) * speed }

  const useAccent = Math.random() < 0.40
  const colorRgb = useAccent
    ? '__accent__'  
    : CLOUD_STATIC_COLORS[Math.floor(Math.random() * CLOUD_STATIC_COLORS.length)]

  const scaleX = 0.7 + Math.random() * 0.6
  const scaleY = 0.7 + Math.random() * 0.6
  const particles: CloudParticle[] = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2
    const dist  = Math.sqrt(Math.random()) * radius
    return {
      ox: Math.cos(angle) * dist * scaleX,
      oy: Math.sin(angle) * dist * scaleY,
      r: radius * (0.28 + Math.random() * 0.55),
      baseOpacity: 0.028 + Math.random() * 0.062,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.002 + Math.random() * 0.007,
      wobbleAmpX:  3 + Math.random() * 14,
      wobbleAmpY:  3 + Math.random() * 14,
    }
  })

  const driftFrames = big
    ? 2800 + Math.floor(Math.random() * 1800)
    : 1600 + Math.floor(Math.random() * 1200)

  return {
    id: idCounter++,
    pos, vel, particles, radius,
    globalOpacity: 0,
    phase: 'fadein',
    phaseT: 0,
    driftFrames,
    colorRgb,
    accentFraction: useAccent ? 1 : 0,
  }
}

function makeConstellationEdges(stars: { x: number; y: number }[]): [number, number][] {
  const edges: [number, number][] = []
  const connected = new Set([0])

  while (connected.size < stars.length) {
    let bestDist = Infinity, bestI = -1, bestJ = -1
    for (const i of connected) {
      for (let j = 0; j < stars.length; j++) {
        if (connected.has(j)) continue
        const dx = stars[i].x - stars[j].x
        const dy = stars[i].y - stars[j].y
        const d = dx * dx + dy * dy
        if (d < bestDist) { bestDist = d; bestI = i; bestJ = j }
      }
    }
    if (bestJ === -1) break
    edges.push([bestI, bestJ])
    connected.add(bestJ)
  }

  const extras = 1 + Math.floor(Math.random() * 2)
  for (let e = 0; e < extras; e++) {
    const i = Math.floor(Math.random() * stars.length)
    const j = (i + 2 + Math.floor(Math.random() * (stars.length - 3))) % stars.length
    if (i === j) continue
    const dx = stars[i].x - stars[j].x
    const dy = stars[i].y - stars[j].y
    if (Math.sqrt(dx * dx + dy * dy) < 220) edges.push([i, j])
  }

  return edges
}

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cursorBlackHole = useDesktopStore((s) => s.cursorBlackHole)
  const bhStrength = useDesktopStore((s) => s.bhStrength)
  const bhStrengthRef = useRef(bhStrength)
  useEffect(() => { bhStrengthRef.current = bhStrength }, [bhStrength])
  const cursorBHRef = useRef(cursorBlackHole)
  useEffect(() => { cursorBHRef.current = cursorBlackHole }, [cursorBlackHole])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let W = window.innerWidth
    let H = window.innerHeight
    canvas.width = W
    canvas.height = H

    const blackHoles: BlackHole[] = [
      { pos: { x: W * 0.3, y: H * 0.4 }, radius: 18, ringPhase: 0 },
      { pos: { x: W * 0.72, y: H * 0.6 }, radius: 14, ringPhase: Math.PI },
    ]
    const satellite: Satellite = {
      angle: 0, orbitRadius: 55, orbitSpeed: 0.012, blackHoleIndex: 0,
    }

    let objects: SpaceObject[] = []
    for (let i = 0; i < 2; i++) objects.push(...makeDebrisGroup(W, H))

    let stars = makeStars(W, H)
    let starEvents: StarEvent[] = []
    let lastStarEvent = -15000
    let lastConstellationSpawn = -35000

    let clouds: GaseousCloud[] = []
    let lastCloudSpawn = -18000

    let lastSpawn = 0
    const mousePos = { x: -9999, y: -9999 }

    const onResize = () => {
      W = window.innerWidth; H = window.innerHeight
      canvas.width = W; canvas.height = H
      blackHoles[0].pos = { x: W * 0.3, y: H * 0.4 }
      blackHoles[1].pos = { x: W * 0.72, y: H * 0.6 }
      stars.forEach(s => { s.x = s.x % W; s.y = s.y % H })
    }

    const onMouseMove = (e: MouseEvent) => {
      mousePos.x = e.clientX
      mousePos.y = e.clientY
    }

    const onClick = () => {
      if (cursorBHRef.current) objects.push(makeRandomAsteroid())
    }

    window.addEventListener('resize', onResize)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('click', onClick)

    function getAccent() {
      return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00ff88'
    }

    function accentToRgb(hex: string): string {
      const c = hex.replace('#', '')
      if (c.length === 6) {
        const r = parseInt(c.slice(0, 2), 16)
        const g = parseInt(c.slice(2, 4), 16)
        const b = parseInt(c.slice(4, 6), 16)
        return `${r},${g},${b}`
      }
      return '0,255,136'
    }

    function drawStars() {
      stars.forEach(star => {
        if (star.inEvent) return

        star.twinklePhase += star.twinkleSpeed
        star.opacity = star.baseOpacity * (0.5 + 0.5 * Math.sin(star.twinklePhase))

        star.x = ((star.x + star.vx) + W) % W
        star.y = ((star.y + star.vy) + H) % H

        const col = star.warm ? '#fff3d4' : '#d8eeff'

        ctx.save()
        ctx.globalAlpha = star.opacity
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fill()

        if (star.size > 1.2) {
          const arm = star.size * 3.2
          ctx.strokeStyle = col
          ctx.lineWidth = 0.45
          ctx.globalAlpha = star.opacity * 0.38
          ctx.beginPath()
          ctx.moveTo(star.x - arm, star.y); ctx.lineTo(star.x + arm, star.y)
          ctx.moveTo(star.x, star.y - arm); ctx.lineTo(star.x, star.y + arm)
          ctx.stroke()
        }
        ctx.restore()
      })
    }

    function drawGaseousCloud(cloud: GaseousCloud) {
      if (cloud.globalOpacity <= 0.002) return
      const accent = getAccent()
      const accentRgb = accentToRgb(accent)
      const rgb = cloud.colorRgb === '__accent__' ? accentRgb : cloud.colorRgb

      ctx.save()
      ctx.globalCompositeOperation = 'screen'

      cloud.particles.forEach(p => {
        p.wobblePhase += p.wobbleSpeed

        const px = cloud.pos.x + p.ox + Math.sin(p.wobblePhase) * p.wobbleAmpX
        const py = cloud.pos.y + p.oy + Math.cos(p.wobblePhase * 0.73) * p.wobbleAmpY

        const a = p.baseOpacity * cloud.globalOpacity
        if (a < 0.001) return

        const g = ctx.createRadialGradient(px, py, 0, px, py, p.r)
        g.addColorStop(0,    `rgba(${rgb},${Math.min(1, a * 3.2)})`)
        g.addColorStop(0.35, `rgba(${rgb},${Math.min(1, a * 1.4)})`)
        g.addColorStop(0.70, `rgba(${rgb},${Math.min(1, a * 0.45)})`)
        g.addColorStop(1,    `rgba(${rgb},0)`)

        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(px, py, p.r, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.restore()
    }

    function trySpawnCloud(timestamp: number) {
      // spawn every 28-34 seconds, max 2 on screen
      const interval = 20000 + Math.random() * 14000
      if (timestamp - lastCloudSpawn < interval) return
      if (clouds.length >= 2) return
      lastCloudSpawn = timestamp
      clouds.push(makeGaseousCloud(W, H))
    }

    const FADE_IN_FRAMES  = 200
    const FADE_OUT_FRAMES = 240

    function updateClouds() {
      clouds = clouds.filter(cloud => {
        if (cloud.phase === 'fadein') {
          cloud.phaseT += 1 / FADE_IN_FRAMES
          cloud.globalOpacity = Math.min(1, cloud.phaseT)
          if (cloud.phaseT >= 1) { cloud.phase = 'drifting'; cloud.phaseT = 0 }

        } else if (cloud.phase === 'drifting') {
          cloud.phaseT++
          if (cloud.phaseT >= cloud.driftFrames) { cloud.phase = 'fadeout'; cloud.phaseT = 0 }

        } else {
          cloud.phaseT += 1 / FADE_OUT_FRAMES
          cloud.globalOpacity = Math.max(0, 1 - cloud.phaseT)
          if (cloud.phaseT >= 1) return false
        }

        blackHoles.forEach((bh, i) => {
          if (i === 1 && cursorBHRef.current) return
          const dx = bh.pos.x - cloud.pos.x
          const dy = bh.pos.y - cloud.pos.y
          const distSq = Math.max(dx * dx + dy * dy, 1)
          const dist   = Math.sqrt(distSq)
          const force  = Math.min(0.0008, (G * BLACK_HOLE_MASS * 0.00012 * bhStrengthRef.current) / distSq)
          cloud.vel.x += (dx / dist) * force
          cloud.vel.y += (dy / dist) * force
        })

        const spd = Math.sqrt(cloud.vel.x ** 2 + cloud.vel.y ** 2)
        const MAX_CLOUD_SPEED = 0.45
        if (spd > MAX_CLOUD_SPEED) {
          cloud.vel.x = (cloud.vel.x / spd) * MAX_CLOUD_SPEED
          cloud.vel.y = (cloud.vel.y / spd) * MAX_CLOUD_SPEED
        }

        cloud.pos.x += cloud.vel.x
        cloud.pos.y += cloud.vel.y

        const margin = cloud.radius * 1.2 + DESPAWN_MARGIN
        if (
          cloud.pos.x < -margin || cloud.pos.x > W + margin ||
          cloud.pos.y < -margin || cloud.pos.y > H + margin
        ) return false

        drawGaseousCloud(cloud)
        return true
      })
    }

    // function trySpawnStarEvent(timestamp: number) {
    //   const interval = 18000 + Math.random() * 20000
    //   if (timestamp - lastStarEvent < interval) return
    //   if (stars.length < 4) return
    //   lastStarEvent = timestamp

    //   let attempts = 0
    //   let i1 = 0, i2 = 1
    //   while (attempts++ < 30) {
    //     i1 = Math.floor(Math.random() * stars.length)
    //     i2 = Math.floor(Math.random() * stars.length)
    //     if (i2 === i1) continue
    //     const dx = stars[i1].x - stars[i2].x
    //     const dy = stars[i1].y - stars[i2].y
    //     if (Math.sqrt(dx * dx + dy * dy) > 80) break
    //   }
    //   const s1 = stars[i1], s2 = stars[i2]
    //   const cx = (s1.x + s2.x) / 2
    //   const cy = (s1.y + s2.y) / 2
    //   const dx1 = s1.x - cx, dy1 = s1.y - cy
    //   const initialRadius = Math.sqrt(dx1 * dx1 + dy1 * dy1)
    //   const initialAngle1 = Math.atan2(dy1, dx1)
    //   s1.inEvent = true
    //   s2.inEvent = true

    //   const ev: SupernovaEvent = {
    //     type: 'supernova',
    //     phase: 'approaching',
    //     cx, cy,
    //     s1x: s1.x, s1y: s1.y, s1idx: i1,
    //     s2x: s2.x, s2y: s2.y, s2idx: i2,
    //     ox1: s1.x, oy1: s1.y,
    //     ox2: s2.x, oy2: s2.y,
    //     initialRadius,
    //     initialAngle1,
    //     t: 0, radius: 0, flashOpacity: 0,
    //   }
    //   starEvents.push(ev)
    // }

    function trySpawnConstellation(timestamp: number) {
      const interval = 32000 + Math.random() * 28000
      if (timestamp - lastConstellationSpawn < interval) return
      lastConstellationSpawn = timestamp

      const count = 5 + Math.floor(Math.random() * 4)
      const cx = 120 + Math.random() * (W - 240)
      const cy = 120 + Math.random() * (H - 240)
      const spreadX = 110 + Math.random() * 160
      const spreadY = 80 + Math.random() * 130

      const positions = Array.from({ length: count }, () => ({
        x: cx + (Math.random() - 0.5) * spreadX * 2,
        y: cy + (Math.random() - 0.5) * spreadY * 2,
      }))

      const ev: ConstellationEvent = {
        type: 'constellation',
        phase: 'fadein',
        starPositions: positions,
        edges: makeConstellationEdges(positions),
        opacity: 0,
        t: 0,
      }
      starEvents.push(ev)
    }

    function drawSupernova(ev: SupernovaEvent) {
      const accent = getAccent()

      if (ev.phase === 'approaching') {
        ;[{ x: ev.s1x, y: ev.s1y }, { x: ev.s2x, y: ev.s2y }].forEach(p => {
          ctx.save()
          ctx.globalAlpha = 0.92
          ctx.fillStyle = '#e8f4ff'
          ctx.beginPath()
          ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2)
          ctx.fill()
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10)
          g.addColorStop(0, 'rgba(200,230,255,0.3)')
          g.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = g
          ctx.globalAlpha = 0.6 + ev.t * 0.4
          ctx.beginPath()
          ctx.arc(p.x, p.y, 10, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        })

        if (ev.t > 0.25) {
          const traceAlpha = Math.min((ev.t - 0.25) / 0.3, 1) * 0.12
          const r = ev.initialRadius * (1 - ev.t * ev.t)
          ctx.save()
          ctx.globalAlpha = traceAlpha
          ctx.strokeStyle = accent
          ctx.lineWidth = 0.5
          ctx.setLineDash([2, 5])
          ctx.beginPath()
          ctx.arc(ev.cx, ev.cy, r, 0, Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.restore()
        }
      }

      if (ev.phase === 'flash') {
        const r = 5 + (1 - ev.flashOpacity) * 55
        ctx.save()
        const g = ctx.createRadialGradient(ev.cx, ev.cy, 0, ev.cx, ev.cy, r)
        g.addColorStop(0,   `rgba(255,255,255,${ev.flashOpacity})`)
        g.addColorStop(0.2, `rgba(220,245,255,${ev.flashOpacity * 0.8})`)
        g.addColorStop(0.5, `rgba(150,220,255,${ev.flashOpacity * 0.4})`)
        g.addColorStop(1,   'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(ev.cx, ev.cy, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      if (ev.phase === 'ring') {
        const lw = Math.max(0.4, 2.5 * (1 - ev.t * 0.8))
        ctx.save()
        ctx.globalAlpha = ev.flashOpacity * 0.9
        ctx.strokeStyle = accent
        ctx.lineWidth = lw
        ctx.beginPath()
        ctx.arc(ev.cx, ev.cy, ev.radius, 0, Math.PI * 2)
        ctx.stroke()

        ctx.globalAlpha = ev.flashOpacity * 0.35
        ctx.lineWidth = lw * 3
        ctx.beginPath()
        ctx.arc(ev.cx, ev.cy, ev.radius * 0.85, 0, Math.PI * 2)
        ctx.stroke()

        const remnantR = Math.max(0, 4 * (1 - ev.t))
        if (remnantR > 0) {
          const g2 = ctx.createRadialGradient(ev.cx, ev.cy, 0, ev.cx, ev.cy, remnantR * 4)
          g2.addColorStop(0, `rgba(255,255,255,${ev.flashOpacity * 0.7})`)
          g2.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.globalAlpha = 1
          ctx.fillStyle = g2
          ctx.beginPath()
          ctx.arc(ev.cx, ev.cy, remnantR * 4, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }
    }

    function drawConstellation(ev: ConstellationEvent) {
      const accent = getAccent()
      const { starPositions, edges, opacity } = ev
      if (opacity <= 0) return

      ctx.save()
      ctx.globalAlpha = opacity * 0.28
      ctx.strokeStyle = accent
      ctx.lineWidth = 0.55
      ctx.setLineDash([3, 6])
      ctx.lineCap = 'round'
      edges.forEach(([i, j]) => {
        const a = starPositions[i], b = starPositions[j]
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      })
      ctx.setLineDash([])
      ctx.restore()

      starPositions.forEach(p => {
        ctx.save()
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 7)
        g.addColorStop(0, `rgba(${accentToRgb(accent)},${opacity * 0.25})`)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        
        ctx.fillStyle = g
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2)
        ctx.fill()

        ctx.globalAlpha = opacity * 0.75
        ctx.fillStyle = '#ddeeff'
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2)
        ctx.fill()

        ctx.globalAlpha = opacity * 0.35
        ctx.strokeStyle = '#ddeeff'
        ctx.lineWidth = 0.4
        ctx.beginPath()
        ctx.moveTo(p.x - 5, p.y); ctx.lineTo(p.x + 5, p.y)
        ctx.moveTo(p.x, p.y - 5); ctx.lineTo(p.x, p.y + 5)
        ctx.stroke()
        ctx.restore()
      })
    }

    function updateStarEvents(timestamp: number) {
      starEvents = starEvents.filter(ev => {
        if (ev.type === 'supernova') {
          if (ev.phase === 'approaching') {
            ev.t += 1 / 230
            const spiralT = ev.t * ev.t
            const currentRadius = ev.initialRadius * (1 - spiralT)
            const currentAngle = ev.initialAngle1 + spiralT * Math.PI * 3.5

            ev.s1x = ev.cx + Math.cos(currentAngle) * currentRadius
            ev.s1y = ev.cy + Math.sin(currentAngle) * currentRadius
            ev.s2x = ev.cx + Math.cos(currentAngle + Math.PI) * currentRadius
            ev.s2y = ev.cy + Math.sin(currentAngle + Math.PI) * currentRadius

            if (ev.t >= 1) { ev.phase = 'flash'; ev.t = 0; ev.flashOpacity = 1 }

          } else if (ev.phase === 'flash') {
            ev.t += 1 / 28
            ev.flashOpacity = 1 - ev.t
            if (ev.t >= 1) { ev.phase = 'ring'; ev.t = 0; ev.flashOpacity = 1 }
          } else if (ev.phase === 'ring') {
            ev.t += 1 / 160
            ev.radius = ev.t * 140
            ev.flashOpacity = Math.pow(1 - ev.t, 1.6)
            if (ev.t >= 1) {
              stars[ev.s1idx].inEvent = false
              stars[ev.s1idx].baseOpacity = 0
              stars[ev.s2idx].inEvent = false
              stars[ev.s2idx].baseOpacity = 0
              stars.push({
                x: ev.cx, y: ev.cy,
                size: 0.8, opacity: 0,
                baseOpacity: 0.55 + Math.random() * 0.25,
                twinkleSpeed: 0.03 + Math.random() * 0.04,
                twinklePhase: 0,
                vx: (Math.random() - 0.5) * 0.03,
                vy: (Math.random() - 0.5) * 0.03,
                warm: false, inEvent: false,
              })
              ev.phase = 'done'
            }
          }
          drawSupernova(ev)
          return ev.phase !== 'done'

        } else {
          if (ev.phase === 'fadein') {
            ev.t += 1 / 130
            ev.opacity = ev.t
            if (ev.t >= 1) { ev.phase = 'hold'; ev.t = 0; ev.opacity = 1 }

          } else if (ev.phase === 'hold') {
            ev.t += 1 / 750
            if (ev.t >= 1) { ev.phase = 'fadeout'; ev.t = 0 }

          } else if (ev.phase === 'fadeout') {
            ev.t += 1 / 190
            ev.opacity = 1 - ev.t
            if (ev.t >= 1) { ev.phase = 'done' }
          }
          drawConstellation(ev)
          return ev.phase !== 'done'
        }
      })
    }

    function drawOutline(obj: SpaceObject, scaleFactor: number) {
      if (!obj.shape.length) return
      ctx.save()
      ctx.globalAlpha = obj.opacity
      ctx.strokeStyle = getAccent()
      ctx.lineWidth = 1
      ctx.translate(obj.pos.x, obj.pos.y)
      ctx.rotate(obj.rotation)
      ctx.scale(scaleFactor, scaleFactor)
      ctx.beginPath()
      ctx.moveTo(obj.shape[0].x, obj.shape[0].y)
      for (let i = 1; i < obj.shape.length; i++) ctx.lineTo(obj.shape[i].x, obj.shape[i].y)
      ctx.closePath()
      ctx.stroke()
      ctx.restore()
    }

    function drawEarthContinents(obj: SpaceObject, scaleFactor: number) {
      ctx.save()
      ctx.translate(obj.pos.x, obj.pos.y)
      ctx.rotate(obj.rotation)
      ctx.scale(scaleFactor, scaleFactor)
      ctx.globalAlpha = obj.opacity * 0.7
      ctx.strokeStyle = getAccent()
      ctx.lineWidth = 0.8
      CONTINENTS.forEach((c) => {
        ctx.beginPath()
        ctx.moveTo(c[0].x * obj.baseSize, c[0].y * obj.baseSize)
        for (let i = 1; i < c.length; i++) ctx.lineTo(c[i].x * obj.baseSize, c[i].y * obj.baseSize)
        ctx.closePath()
        ctx.stroke()
      })
      ctx.restore()
    }

    function drawPlanetRing(obj: SpaceObject, scaleFactor: number) {
      ctx.save()
      ctx.translate(obj.pos.x, obj.pos.y)
      ctx.rotate(obj.rotation + 0.4)
      ctx.scale(scaleFactor, scaleFactor * 0.28)
      ctx.globalAlpha = obj.opacity * 0.5
      ctx.strokeStyle = getAccent()
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(0, 0, obj.baseSize * 1.75, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    function drawOrbitPath(parentPos: Vec2, moonPos: Vec2, opacity: number) {
      const dx = moonPos.x - parentPos.x
      const dy = moonPos.y - parentPos.y
      const r = Math.sqrt(dx * dx + dy * dy)
      ctx.save()
      ctx.globalAlpha = opacity * 0.12
      ctx.strokeStyle = getAccent()
      ctx.lineWidth = 0.5
      ctx.setLineDash([3, 5])
      ctx.beginPath()
      ctx.arc(parentPos.x, parentPos.y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }

    function drawMeteorTrail(obj: SpaceObject) {
      if (!obj.trail || obj.trail.length < 2) return
      const speed = Math.sqrt(obj.vel.x ** 2 + obj.vel.y ** 2)
      ctx.save()
      for (let i = 1; i < obj.trail.length; i++) {
        const t = i / obj.trail.length
        ctx.globalAlpha = obj.opacity * t * 0.35
        ctx.strokeStyle = getAccent()
        ctx.lineWidth = Math.max(0.3, obj.size * 0.5 * t * (speed / 6))
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(obj.trail[i - 1].x, obj.trail[i - 1].y)
        ctx.lineTo(obj.trail[i].x, obj.trail[i].y)
        ctx.stroke()
      }
      ctx.restore()
    }

    function drawBlackHole(bh: BlackHole) {
      const accent = getAccent()
      ctx.save()
      ctx.beginPath()
      ctx.arc(bh.pos.x, bh.pos.y, bh.radius, 0, Math.PI * 2)
      ctx.fillStyle = '#050505'
      ctx.fill()
      ctx.restore()
      ctx.save()
      ctx.strokeStyle = accent
      const rings = [
        { r: bh.radius + 5,  gap: 0.4, op: 0.55, lw: 1.2 },
        { r: bh.radius + 11, gap: 0.7, op: 0.3,  lw: 0.8 },
        { r: bh.radius + 20, gap: 1.1, op: 0.15, lw: 0.6 },
      ]
      rings.forEach(({ r, gap, op, lw }) => {
        ctx.globalAlpha = op
        ctx.lineWidth = lw
        ctx.beginPath()
        ctx.arc(bh.pos.x, bh.pos.y, r, bh.ringPhase + gap, bh.ringPhase + Math.PI * 2 - gap)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(bh.pos.x, bh.pos.y, r, bh.ringPhase + Math.PI + gap * 0.5, bh.ringPhase + Math.PI * 1.8)
        ctx.stroke()
      })
      ctx.restore()
    }

    function drawSatellite() {
      const bh = blackHoles[satellite.blackHoleIndex]
      const sx = bh.pos.x + Math.cos(satellite.angle) * satellite.orbitRadius
      const sy = bh.pos.y + Math.sin(satellite.angle) * satellite.orbitRadius
      const accent = getAccent()
      ctx.save()
      ctx.translate(sx, sy)
      ctx.rotate(satellite.angle + Math.PI / 2)
      ctx.globalAlpha = 0.6
      ctx.strokeStyle = accent
      ctx.lineWidth = 1
      ctx.strokeRect(-4, -5, 8, 10)
      ctx.beginPath()
      ctx.moveTo(-4, -2); ctx.lineTo(-12, -2)
      ctx.moveTo(-4, 2);  ctx.lineTo(-12, 2)
      ctx.moveTo(-12, -4); ctx.lineTo(-12, 4)
      ctx.moveTo(4, -2);  ctx.lineTo(12, -2)
      ctx.moveTo(4, 2);   ctx.lineTo(12, 2)
      ctx.moveTo(12, -4); ctx.lineTo(12, 4)
      ctx.moveTo(0, -5);  ctx.lineTo(0, -10)
      ctx.moveTo(0, -10); ctx.lineTo(-3, -8)
      ctx.moveTo(0, -10); ctx.lineTo(3, -8)
      ctx.stroke()
      ctx.restore()
      ctx.save()
      ctx.globalAlpha = 0.07
      ctx.strokeStyle = accent
      ctx.lineWidth = 0.5
      ctx.setLineDash([4, 6])
      ctx.beginPath()
      ctx.arc(bh.pos.x, bh.pos.y, satellite.orbitRadius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }

    function applyBlackHoleGravity(obj: SpaceObject): number {
      let distMin = Infinity
      blackHoles.forEach((bh, i) => {
        if (i === 1 && cursorBHRef.current) return
        const dx = bh.pos.x - obj.pos.x
        const dy = bh.pos.y - obj.pos.y
        const distSq = dx * dx + dy * dy
        const dist = Math.sqrt(distSq)
        if (dist < distMin) distMin = dist
        if (dist < bh.radius + 2) { obj.swallowed = true; return }
        const force = (G * BLACK_HOLE_MASS * bhStrengthRef.current) / distSq
        obj.vel.x += (dx / dist) * force
        obj.vel.y += (dy / dist) * force
      })
      return distMin
    }

    function applyObjectGravity(allObjects: SpaceObject[]) {
      const sources = allObjects.filter(
        (o) => !o.swallowed && (o.type === 'planet' || o.type === 'earth' || o.type === 'asteroid')
      )
      for (const obj of allObjects) {
        if (obj.swallowed) continue
        for (const src of sources) {
          if (src.id === obj.id) continue
          const dx = src.pos.x - obj.pos.x
          const dy = src.pos.y - obj.pos.y
          const distSq = Math.max(dx * dx + dy * dy, 100)
          const dist = Math.sqrt(distSq)
          const force = (G * src.mass) / distSq
          obj.vel.x += (dx / dist) * force
          obj.vel.y += (dy / dist) * force
        }
      }
    }

    function enforceMoonMinDist(obj: SpaceObject, objectMap: Map<number, SpaceObject>) {
      if (obj.parentId === undefined || obj.minDistFromParent === undefined) return
      const parent = objectMap.get(obj.parentId)
      if (!parent || parent.swallowed) { obj.parentId = undefined; return }
      const dx = obj.pos.x - parent.pos.x
      const dy = obj.pos.y - parent.pos.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < obj.minDistFromParent) {
        const nx = dx / dist
        const ny = dy / dist
        obj.pos.x = parent.pos.x + nx * obj.minDistFromParent
        obj.pos.y = parent.pos.y + ny * obj.minDistFromParent
        const radialVel = obj.vel.x * nx + obj.vel.y * ny
        if (radialVel < 0) {
          obj.vel.x -= radialVel * nx
          obj.vel.y -= radialVel * ny
        }
      }
    }

    const COLLIDABLE = new Set(['asteroid', 'planet', 'earth', 'meteor'])
    let pendingDebris: SpaceObject[] = []

    function checkCollisions() {
      const collidable = objects.filter((o) => COLLIDABLE.has(o.type) && !o.swallowed)
      for (let i = 0; i < collidable.length; i++) {
        for (let j = i + 1; j < collidable.length; j++) {
          const a = collidable[i]
          const b = collidable[j]
          const dx = a.pos.x - b.pos.x
          const dy = a.pos.y - b.pos.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < a.size * 0.7 + b.size * 0.7) {
            a.swallowed = true
            b.swallowed = true
            const mid = { x: (a.pos.x + b.pos.x) / 2, y: (a.pos.y + b.pos.y) / 2 }
            const avgVel = { x: (a.vel.x + b.vel.x) / 2, y: (a.vel.y + b.vel.y) / 2 }
            pendingDebris.push(...spawnCollisionDebris(mid, avgVel))
          }
        }
      }
    }

    let rafId: number

    function tick(timestamp: number) {
      ctx.clearRect(0, 0, W, H)
      pendingDebris = []

      drawStars()

      trySpawnCloud(timestamp)
      updateClouds()

      // trySpawnStarEvent(timestamp)
      trySpawnConstellation(timestamp)
      updateStarEvents(timestamp)

      if (timestamp - lastSpawn > 3000) {
        lastSpawn = timestamp
        const roll = Math.random()
        if      (roll < 0.28) objects.push(makeAsteroid(W, H))
        else if (roll < 0.46) objects.push(...makeDebrisGroup(W, H))
        else if (roll < 0.60) objects.push(...makePlanetWithMoon(W, H))
        else if (roll < 0.68) objects.push(makeAsteroid(W, H), makeAsteroid(W, H))
        else if (roll < 0.80) objects.push(makeMeteor(W, H))
        else if (roll < 0.88) objects.push(...makeEarth(W, H))
        else if (roll < 0.93) objects.push(makeMeteor(W, H), makeMeteor(W, H))
        else                  objects.push(makeCow(W, H))
      }

      checkCollisions()
      if (pendingDebris.length) objects.push(...pendingDebris)

      const objectMap = new Map<number, SpaceObject>(objects.map((o) => [o.id, o]))
      applyObjectGravity(objects)

      if (cursorBHRef.current && mousePos.x > -9999) {
        const bh = blackHoles[0]
        bh.pos.x += (mousePos.x - bh.pos.x) * 0.12
        bh.pos.y += (mousePos.y - bh.pos.y) * 0.12
      } else if (!cursorBHRef.current) {
        blackHoles[0].pos.x += (W * 0.3 - blackHoles[0].pos.x) * 0.04
        blackHoles[0].pos.y += (H * 0.4 - blackHoles[0].pos.y) * 0.04
      }

      objects = objects.filter((obj) => {
        const distMin = applyBlackHoleGravity(obj)
        if (obj.swallowed) return false

        enforceMoonMinDist(obj, objectMap)

        if (obj.trail !== undefined) {
          obj.trail.push({ x: obj.pos.x, y: obj.pos.y })
          if (obj.trail.length > 22) obj.trail.shift()
        }

        obj.pos.x += obj.vel.x
        obj.pos.y += obj.vel.y
        obj.rotation += obj.rotationSpeed

        const maxSpeed = obj.type === 'debris' ? 3 : obj.type === 'meteor' ? 12 : 8
        const speed = Math.sqrt(obj.vel.x ** 2 + obj.vel.y ** 2)
        if (speed > maxSpeed) {
          obj.vel.x = (obj.vel.x / speed) * maxSpeed
          obj.vel.y = (obj.vel.y / speed) * maxSpeed
        }

        const influence = 130
        const swallowZone = 38
        let scaleFactor = 1
        if (distMin < influence) {
          if (distMin < swallowZone) {
            const inner = 1 - distMin / swallowZone
            scaleFactor = Math.max(0.01, 1 - inner * 0.95)
            obj.opacity = Math.max(0, obj.opacity - 0.05)
            obj.rotationSpeed *= 1.03
          } else {
            scaleFactor = 1 - (1 - distMin / influence) * 0.35
            obj.rotationSpeed *= 1.002
          }
        }

        if (obj.opacity <= 0) return false
        if (isOffscreen(obj.pos, W, H)) return false

        if (obj.type === 'moon' && obj.parentId !== undefined) {
          const parent = objectMap.get(obj.parentId)
          if (parent && !parent.swallowed) drawOrbitPath(parent.pos, obj.pos, obj.opacity)
        }

        if (obj.type === 'meteor') drawMeteorTrail(obj)
        drawOutline(obj, scaleFactor)
        if (obj.type === 'earth') drawEarthContinents(obj, scaleFactor)
        if (obj.type === 'planet' && (obj as any).hasRing && obj.baseSize > 28) {
          drawPlanetRing(obj, scaleFactor)
        }

        return true
      })

      if (objects.length > 45) objects = objects.slice(-45)

      blackHoles.forEach((bh, i) => {
        bh.ringPhase += 0.007
        if (i === 1 && cursorBHRef.current) return
        drawBlackHole(bh)
      })

      satellite.angle += satellite.orbitSpeed
      drawSatellite()

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('click', onClick)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0,
        width: '100%', height: '100%',
        zIndex: 0, pointerEvents: 'none',
        background: 'var(--bg-desktop)',
      }}
    />
  )
}