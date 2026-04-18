import { useEffect, useRef } from 'react'

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

let idCounter = 0

const CONTINENTS: Vec2[][] = [
  [
    { x: -0.65, y: -0.75 }, { x: -0.35, y: -0.70 }, { x: -0.25, y: -0.45 },
    { x: -0.40, y: -0.10 }, { x: -0.55, y: 0.15 }, { x: -0.50, y: 0.55 },
    { x: -0.65, y: 0.75 }, { x: -0.78, y: 0.50 }, { x: -0.72, y: 0.10 },
    { x: -0.80, y: -0.30 }, { x: -0.70, y: -0.60 },
  ],
  [
    { x: -0.05, y: -0.75 }, { x: 0.30, y: -0.70 }, { x: 0.45, y: -0.45 },
    { x: 0.30, y: -0.20 }, { x: 0.40, y: 0.10 }, { x: 0.35, y: 0.50 },
    { x: 0.15, y: 0.80 }, { x: -0.05, y: 0.65 }, { x: -0.10, y: 0.25 },
    { x: 0.05, y: 0.00 }, { x: -0.08, y: -0.40 },
  ],
  [
    { x: 0.30, y: -0.70 }, { x: 0.75, y: -0.55 }, { x: 0.85, y: -0.20 },
    { x: 0.70, y: 0.10 }, { x: 0.45, y: 0.05 }, { x: 0.30, y: -0.20 },
  ],
  [
    { x: 0.50, y: 0.50 }, { x: 0.72, y: 0.42 }, { x: 0.80, y: 0.62 },
    { x: 0.62, y: 0.78 }, { x: 0.44, y: 0.70 },
  ],
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
    case 0: pos = { x: Math.random() * W, y: -DESPAWN_MARGIN }; break
    case 1: pos = { x: W + DESPAWN_MARGIN, y: Math.random() * H }; break
    case 2: pos = { x: Math.random() * W, y: H + DESPAWN_MARGIN }; break
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
    case 0: pos = { x: Math.random() * W, y: -DESPAWN_MARGIN }; break
    case 1: pos = { x: W + DESPAWN_MARGIN, y: Math.random() * H }; break
    case 2: pos = { x: Math.random() * W, y: H + DESPAWN_MARGIN }; break
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
    ...(hasRing ? {} : {}),
  }
    ; (planet as any).hasRing = hasRing

  if (!hasMoon) return [planet]

  // v = sqrt(G * M / r)
  const orbitRadius = size * (1.8 + Math.random() * 1.2)
  const moonSize = size * (0.18 + Math.random() * 0.2)
  const angle = Math.random() * Math.PI * 2
  const direction = Math.random() < 0.5 ? 1 : -1
  const orbitalSpeed = Math.sqrt((G * planet.mass * 300) / orbitRadius) * direction

  const moonPos: Vec2 = {
    x: pos.x + Math.cos(angle) * orbitRadius,
    y: pos.y + Math.sin(angle) * orbitRadius,
  }
  // moon velocity = planet velocity + orbital tangent
  const moonVel: Vec2 = {
    x: planet.vel.x + Math.cos(angle + Math.PI / 2) * orbitalSpeed,
    y: planet.vel.y + Math.sin(angle + Math.PI / 2) * orbitalSpeed,
  }

  const moon: SpaceObject = {
    id: idCounter++, type: 'moon',
    pos: moonPos, vel: moonVel,
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

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

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

    let lastSpawn = 0

    const onResize = () => {
      W = window.innerWidth; H = window.innerHeight
      canvas.width = W; canvas.height = H
      blackHoles[0].pos = { x: W * 0.3, y: H * 0.4 }
      blackHoles[1].pos = { x: W * 0.72, y: H * 0.6 }
    }
    window.addEventListener('resize', onResize)

    function getAccent() {
      return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00ff88'
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
        { r: bh.radius + 5, gap: 0.4, op: 0.55, lw: 1.2 },
        { r: bh.radius + 11, gap: 0.7, op: 0.3, lw: 0.8 },
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
      ctx.moveTo(-4, 2); ctx.lineTo(-12, 2)
      ctx.moveTo(-12, -4); ctx.lineTo(-12, 4)
      ctx.moveTo(4, -2); ctx.lineTo(12, -2)
      ctx.moveTo(4, 2); ctx.lineTo(12, 2)
      ctx.moveTo(12, -4); ctx.lineTo(12, 4)
      ctx.moveTo(0, -5); ctx.lineTo(0, -10)
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

    // minimum distance to any black hole
    function applyBlackHoleGravity(obj: SpaceObject): number {
      let distMin = Infinity
      for (const bh of blackHoles) {
        const dx = bh.pos.x - obj.pos.x
        const dy = bh.pos.y - obj.pos.y
        const distSq = dx * dx + dy * dy
        const dist = Math.sqrt(distSq)
        if (dist < distMin) distMin = dist
        if (dist < bh.radius + 2) { obj.swallowed = true; return 0 }
        const force = (G * BLACK_HOLE_MASS) / distSq
        obj.vel.x += (dx / dist) * force
        obj.vel.y += (dy / dist) * force
      }
      return distMin
    }

    // mutual gravity between all object pairs
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
          const distSq = Math.max(dx * dx + dy * dy, 100) // clamp, no explosion at close range
          const dist = Math.sqrt(distSq)
          const force = (G * src.mass) / distSq
          obj.vel.x += (dx / dist) * force
          obj.vel.y += (dy / dist) * force
        }
      }
    }

    // min distance between moon and parent
    function enforceMoonMinDist(obj: SpaceObject, objectMap: Map<number, SpaceObject>) {
      if (obj.parentId === undefined || obj.minDistFromParent === undefined) return
      const parent = objectMap.get(obj.parentId)
      if (!parent || parent.swallowed) {
        obj.parentId = undefined
        return
      }
      const dx = obj.pos.x - parent.pos.x
      const dy = obj.pos.y - parent.pos.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < obj.minDistFromParent) {
        const nx = dx / dist
        const ny = dy / dist
        obj.pos.x = parent.pos.x + nx * obj.minDistFromParent
        obj.pos.y = parent.pos.y + ny * obj.minDistFromParent
        // zero out the radial velocity component
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

      if (timestamp - lastSpawn > 3000) {
        lastSpawn = timestamp
        const roll = Math.random()
        if (roll < 0.28) objects.push(makeAsteroid(W, H))
        else if (roll < 0.46) objects.push(...makeDebrisGroup(W, H))
        else if (roll < 0.60) objects.push(...makePlanetWithMoon(W, H))
        else if (roll < 0.68) objects.push(makeAsteroid(W, H), makeAsteroid(W, H))
        else if (roll < 0.80) objects.push(makeMeteor(W, H))
        else if (roll < 0.88) objects.push(...makeEarth(W, H))
        else if (roll < 0.93) objects.push(makeMeteor(W, H), makeMeteor(W, H))
        else objects.push(makeCow(W, H))
      }

      checkCollisions()
      if (pendingDebris.length) objects.push(...pendingDebris)

      const objectMap = new Map<number, SpaceObject>(objects.map((o) => [o.id, o]))

      applyObjectGravity(objects)

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

        // spaghettification
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
          if (parent && !parent.swallowed) {
            drawOrbitPath(parent.pos, obj.pos, obj.opacity)
          }
        }

        if (obj.type === 'meteor') drawMeteorTrail(obj)
        drawOutline(obj, scaleFactor)
        if (obj.type === 'earth') drawEarthContinents(obj, scaleFactor)
        if ((obj.type === 'planet') && (obj as any).hasRing && obj.baseSize > 28) {
          drawPlanetRing(obj, scaleFactor)
        }

        return true
      })

      if (objects.length > 45) objects = objects.slice(-45)

      blackHoles.forEach((bh) => { bh.ringPhase += 0.007; drawBlackHole(bh) })
      satellite.angle += satellite.orbitSpeed
      drawSatellite()

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
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