import { useEffect, useRef } from 'react'

const G = 0.4
const BLACK_HOLE_MASS = 8000
const DESPAWN_MARGIN = 300

interface Vec2 { x: number; y: number }

interface SpaceObject {
  id: number
  type: 'asteroid' | 'planet' | 'debris' | 'cow'
  pos: Vec2
  vel: Vec2
  shape: Vec2[]
  rotation: number
  rotationSpeed: number
  opacity: number
  size: number
  baseSize: number
  swallowed: boolean
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

function randomEdgeSpawn(W: number, H: number): { pos: Vec2; vel: Vec2 } {
  const edge = Math.floor(Math.random() * 4)
  const speed = 0.4 + Math.random() * 0.8
  let pos: Vec2
  switch (edge) {
    case 0: pos = { x: Math.random() * W, y: -DESPAWN_MARGIN }; break
    case 1: pos = { x: W + DESPAWN_MARGIN, y: Math.random() * H }; break
    case 2: pos = { x: Math.random() * W, y: H + DESPAWN_MARGIN }; break
    default: pos = { x: -DESPAWN_MARGIN, y: Math.random() * H }; break
  }
  const targetX = W * (0.25 + Math.random() * 0.5)
  const targetY = H * (0.25 + Math.random() * 0.5)
  const dx = targetX - pos.x
  const dy = targetY - pos.y
  const len = Math.sqrt(dx * dx + dy * dy)
  return { pos, vel: { x: (dx / len) * speed, y: (dy / len) * speed } }
}

function randomPositionSpawn(W: number, H: number): { pos: Vec2; vel: Vec2 } {
  const useEdge = Math.random() < 0.5
  if (!useEdge) {
    const angle = Math.random() * Math.PI * 2
    const speed = 0.3 + Math.random() * 0.7
    const pos: Vec2 = {
      x: Math.random() < 0.5 ? -DESPAWN_MARGIN : W + DESPAWN_MARGIN,
      y: Math.random() * H,
    }
    return { pos, vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed } }
  }
  return randomEdgeSpawn(W, H)
}

function makeAsteroidShape(size: number): Vec2[] {
  const points = 6 + Math.floor(Math.random() * 5)
  const shape: Vec2[] = []
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2
    const r = size * (0.55 + Math.random() * 0.45)
    shape.push({ x: Math.cos(a) * r, y: Math.sin(a) * r })
  }
  return shape
}

function makeAsteroid(W: number, H: number): SpaceObject {
  const { pos, vel } = randomPositionSpawn(W, H)
  const size = 7 + Math.random() * 16
  return {
    id: idCounter++, type: 'asteroid', pos, vel,
    shape: makeAsteroidShape(size),
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.025,
    opacity: 0.5 + Math.random() * 0.4,
    size, baseSize: size, swallowed: false,
  }
}

function makePlanet(W: number, H: number): SpaceObject {
  const { pos, vel } = randomEdgeSpawn(W, H)
  const size = 18 + Math.random() * 22
  const points = 32
  const shape: Vec2[] = []
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2
    shape.push({ x: Math.cos(a) * size, y: Math.sin(a) * size })
  }
  return {
    id: idCounter++, type: 'planet', pos,
    vel: { x: vel.x * 0.55, y: vel.y * 0.55 },
    shape, rotation: 0, rotationSpeed: 0.003,
    opacity: 0.45 + Math.random() * 0.3,
    size, baseSize: size, swallowed: false,
  }
}

function makeDebrisGroup(W: number, H: number): SpaceObject[] {
  const count = 3 + Math.floor(Math.random() * 5)
  const { pos: origin, vel: baseVel } = randomEdgeSpawn(W, H)
  const slowVel = { x: baseVel.x * 0.2, y: baseVel.y * 0.2 }

  return Array.from({ length: count }, () => {
    const size = 2 + Math.random() * 5
    const spread = 40 + Math.random() * 60
    const shape: Vec2[] = [
      { x: 0, y: -size },
      { x: size * 0.8, y: size * 0.6 },
      { x: -size * 0.8, y: size * 0.6 },
    ]

    const pos: Vec2 = {
      x: origin.x + (Math.random() - 0.5) * spread,
      y: origin.y + (Math.random() - 0.5) * spread,
    }

    const vel: Vec2 = {
      x: slowVel.x + (Math.random() - 0.5) * 0.15,
      y: slowVel.y + (Math.random() - 0.5) * 0.15,
    }
    return {
      id: idCounter++, type: 'debris' as const, pos, vel, shape,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.01,
      opacity: 0.2 + Math.random() * 0.25,
      size, baseSize: size, swallowed: false,
    }
  })
}

function makeCow(W: number, H: number): SpaceObject {
  const { pos, vel } = randomEdgeSpawn(W, H)
  const shape: Vec2[] = [
    { x: -18, y: -8 }, { x: -12, y: -14 }, { x: 0, y: -15 },
    { x: 12, y: -14 }, { x: 18, y: -8 }, { x: 18, y: 4 },
    { x: 12, y: 8 }, { x: 10, y: 8 }, { x: 10, y: 18 },
    { x: 6, y: 18 }, { x: 6, y: 8 }, { x: -6, y: 8 },
    { x: -6, y: 18 }, { x: -10, y: 18 }, { x: -10, y: 8 },
    { x: -18, y: 4 }, { x: -18, y: -8 }, { x: -24, y: -10 },
    { x: -28, y: -6 }, { x: -28, y: 2 }, { x: -22, y: 4 }, { x: -18, y: 4 },
  ]
  return {
    id: idCounter++, type: 'cow', pos,
    vel: { x: vel.x * 0.5, y: vel.y * 0.5 },
    shape, rotation: Math.random() * Math.PI * 2,
    rotationSpeed: 0.008, opacity: 0.7,
    size: 28, baseSize: 28, swallowed: false,
  }
}

function isOffscreen(pos: Vec2, W: number, H: number): boolean {
  return (
    pos.x < -DESPAWN_MARGIN * 2 || pos.x > W + DESPAWN_MARGIN * 2 ||
    pos.y < -DESPAWN_MARGIN * 2 || pos.y > H + DESPAWN_MARGIN * 2
  )
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
    for (let i = 0; i < 2; i++) {
      objects.push(...makeDebrisGroup(W, H))
    }

    let lastSpawn = 0

    const onResize = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W
      canvas.height = H
      blackHoles[0].pos = { x: W * 0.3, y: H * 0.4 }
      blackHoles[1].pos = { x: W * 0.72, y: H * 0.6 }
    }
    window.addEventListener('resize', onResize)

    function getAccent() {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--accent').trim() || '#00ff88'
    }

    function drawOutline(
      obj: SpaceObject,
      scaleFactor: number,
    ) {
      const { shape, pos, rotation, opacity } = obj
      if (shape.length < 2) return
      ctx.save()
      ctx.globalAlpha = opacity
      ctx.strokeStyle = getAccent()
      ctx.lineWidth = 1
      ctx.translate(pos.x, pos.y)
      ctx.rotate(rotation)
      ctx.scale(scaleFactor, scaleFactor)
      ctx.beginPath()
      ctx.moveTo(shape[0].x, shape[0].y)
      for (let i = 1; i < shape.length; i++) ctx.lineTo(shape[i].x, shape[i].y)
      ctx.closePath()
      ctx.stroke()
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

      const rings = [
        { r: bh.radius + 5,  gap: 0.4, op: 0.55, lw: 1.2 },
        { r: bh.radius + 11, gap: 0.7, op: 0.3,  lw: 0.8 },
        { r: bh.radius + 19, gap: 1.1, op: 0.15, lw: 0.6 },
      ]
      ctx.save()
      ctx.strokeStyle = accent
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

      // Faint orbit ring
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

    function drawPlanetRing(obj: SpaceObject, scaleFactor: number) {
      const accent = getAccent()
      ctx.save()
      ctx.translate(obj.pos.x, obj.pos.y)
      ctx.rotate(obj.rotation + 0.4)
      ctx.scale(scaleFactor, scaleFactor * 0.28)
      ctx.globalAlpha = obj.opacity * 0.55
      ctx.strokeStyle = accent
      ctx.lineWidth = 1 / scaleFactor
      ctx.beginPath()
      ctx.arc(0, 0, obj.baseSize * 1.75, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    function applyGravity(obj: SpaceObject): { distMin: number } {
      let distMin = Infinity

      for (const bh of blackHoles) {
        const dx = bh.pos.x - obj.pos.x
        const dy = bh.pos.y - obj.pos.y
        const distSq = dx * dx + dy * dy
        const dist = Math.sqrt(distSq)
        if (dist < distMin) distMin = dist

        if (dist < bh.radius + 2) {
          obj.swallowed = true
          return { distMin: 0 }
        }

        const force = (G * BLACK_HOLE_MASS) / distSq
        obj.vel.x += (dx / dist) * force
        obj.vel.y += (dy / dist) * force
      }

      const speed = Math.sqrt(obj.vel.x ** 2 + obj.vel.y ** 2)
      const maxSpeed = obj.type === 'debris' ? 3 : 7
      if (speed > maxSpeed) {
        obj.vel.x = (obj.vel.x / speed) * maxSpeed
        obj.vel.y = (obj.vel.y / speed) * maxSpeed
      }

      return { distMin }
    }

    let rafId: number

    function tick(timestamp: number) {
      ctx.clearRect(0, 0, W, H)

      // Spawn
      if (timestamp - lastSpawn > 3200) {
        lastSpawn = timestamp
        const roll = Math.random()
        if (roll < 0.42)      objects.push(makeAsteroid(W, H))
        else if (roll < 0.68) objects.push(...makeDebrisGroup(W, H))
        else if (roll < 0.84) objects.push(makePlanet(W, H))
        else if (roll < 0.97) objects.push(makeAsteroid(W, H), makeAsteroid(W, H))
        else                  objects.push(makeCow(W, H))
      }

      objects = objects.filter((obj) => {
        const { distMin } = applyGravity(obj)
        obj.pos.x += obj.vel.x
        obj.pos.y += obj.vel.y
        obj.rotation += obj.rotationSpeed

        const influence = 120
        const swallowZone = 40
        let scaleFactor = 1

        if (distMin < influence) {
          const t = 1 - (distMin / influence)   // 0 at edge, 1 at center
          const tClamped = Math.max(0, Math.min(1, t))

          if (distMin < swallowZone) {
            const inner = 1 - (distMin / swallowZone)
            scaleFactor = Math.max(0.01, 1 - inner * 0.95)
            obj.opacity = Math.max(0, obj.opacity - 0.04)
          } else {
            scaleFactor = 1 - tClamped * 0.35
            obj.rotationSpeed *= 1.002
          }
        }

        if (obj.swallowed || obj.opacity <= 0) return false
        if (isOffscreen(obj.pos, W, H)) return false

        drawOutline(obj, scaleFactor)

        if (obj.type === 'planet' && obj.baseSize > 28) {
          drawPlanetRing(obj, scaleFactor)
        }

        return true
      })

      if (objects.length > 30) objects = objects.slice(-30)

      blackHoles.forEach((bh) => {
        bh.ringPhase += 0.007
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
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        background: 'var(--bg-desktop)',
      }}
    />
  )
}