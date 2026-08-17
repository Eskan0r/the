import { useEffect, useRef } from 'react'

const G = 0.4
const BH_MASS = 8000
const DESPAWN_MARGIN = 100

interface Vec2 { x: number; y: number }

interface SpaceObject {
  type: 'asteroid' | 'planet' | 'debris' | 'meteor'
  pos: Vec2
  vel: Vec2
  shape: Vec2[]
  rotation: number
  rotationSpeed: number
  opacity: number
  size: number
  swallowed: boolean
  trail?: Vec2[]
}

function makeAsteroidShape(size: number): Vec2[] {
  const pts = 6 + Math.floor(Math.random() * 5)
  return Array.from({ length: pts }, (_, i) => {
    const a = (i / pts) * Math.PI * 2
    const r = size * (0.55 + Math.random() * 0.45)
    return { x: Math.cos(a) * r, y: Math.sin(a) * r }
  })
}

function makeCircleShape(r: number, pts = 24): Vec2[] {
  return Array.from({ length: pts }, (_, i) => {
    const a = (i / pts) * Math.PI * 2
    return { x: Math.cos(a) * r, y: Math.sin(a) * r }
  })
}

function randomSpawn(W: number, H: number): { pos: Vec2; vel: Vec2 } {
  const edge = Math.floor(Math.random() * 4)
  let pos: Vec2
  switch (edge) {
    case 0:  pos = { x: Math.random() * W, y: -DESPAWN_MARGIN }; break
    case 1:  pos = { x: W + DESPAWN_MARGIN, y: Math.random() * H }; break
    case 2:  pos = { x: Math.random() * W, y: H + DESPAWN_MARGIN }; break
    default: pos = { x: -DESPAWN_MARGIN, y: Math.random() * H }; break
  }
  const tx = W * (0.1 + Math.random() * 0.8)
  const ty = H * (0.1 + Math.random() * 0.8)
  const dx = tx - pos.x, dy = ty - pos.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const speed = 0.3 + Math.random() * 0.6
  return { pos, vel: { x: (dx / len) * speed, y: (dy / len) * speed } }
}

function makeAsteroid(W: number, H: number): SpaceObject {
  const { pos, vel } = randomSpawn(W, H)
  const size = 5 + Math.random() * 12
  return {
    type: 'asteroid', pos, vel,
    shape: makeAsteroidShape(size),
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.02,
    opacity: 0.4 + Math.random() * 0.4,
    size, swallowed: false,
  }
}

function makePlanet(W: number, H: number): SpaceObject {
  const { pos, vel } = randomSpawn(W, H)
  const size = 10 + Math.random() * 16
  const obj: SpaceObject = {
    type: 'planet', pos,
    vel: { x: vel.x * 0.5, y: vel.y * 0.5 },
    shape: makeCircleShape(size),
    rotation: 0, rotationSpeed: 0.003,
    opacity: 0.4 + Math.random() * 0.3,
    size, swallowed: false,
  }
  return obj
}

function makeDebrisGroup(W: number, H: number): SpaceObject[] {
  const count = 3 + Math.floor(Math.random() * 4)
  const { pos: origin, vel: baseVel } = randomSpawn(W, H)
  const slowVel = { x: baseVel.x * 0.2, y: baseVel.y * 0.2 }
  const spread = 30 + Math.random() * 40
  return Array.from({ length: count }, () => {
    const size = 2 + Math.random() * 4
    return {
      type: 'debris' as const,
      pos: {
        x: origin.x + (Math.random() - 0.5) * spread,
        y: origin.y + (Math.random() - 0.5) * spread,
      },
      vel: {
        x: slowVel.x + (Math.random() - 0.5) * 0.1,
        y: slowVel.y + (Math.random() - 0.5) * 0.1,
      },
      shape: [
        { x: 0, y: -size },
        { x: size * 0.8, y: size * 0.6 },
        { x: -size * 0.8, y: size * 0.6 },
      ],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.01,
      opacity: 0.2 + Math.random() * 0.25,
      size, swallowed: false,
    }
  })
}

function makeMeteor(W: number, H: number): SpaceObject {
  const speed = 2 + Math.random() * 2
  const { pos, vel } = randomSpawn(W, H)
  vel.x *= speed / 0.5; vel.y *= speed / 0.5
  const size = 2 + Math.random() * 3
  return {
    type: 'meteor', pos, vel,
    shape: makeAsteroidShape(size),
    rotation: Math.atan2(vel.y, vel.x),
    rotationSpeed: 0, opacity: 0.7,
    size, swallowed: false,
    trail: [],
  }
}

interface Star {
  x: number; y: number; size: number; opacity: number
  baseOpacity: number; twinkleSpeed: number; twinklePhase: number
  vx: number; vy: number; warm: boolean
}

function makeStars(W: number, H: number): Star[] {
  return Array.from({ length: 60 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    size: 0.3 + Math.random() * 1.4,
    opacity: Math.random(), baseOpacity: 0.2 + Math.random() * 0.5,
    twinkleSpeed: 0.005 + Math.random() * 0.02,
    twinklePhase: Math.random() * Math.PI * 2,
    vx: (Math.random() - 0.5) * 0.03,
    vy: (Math.random() - 0.5) * 0.03,
    warm: Math.random() < 0.25,
  }))
}

function isOffscreen(pos: Vec2, W: number, H: number): boolean {
  return pos.x < -DESPAWN_MARGIN * 2 || pos.x > W + DESPAWN_MARGIN * 2 ||
    pos.y < -DESPAWN_MARGIN * 2 || pos.y > H + DESPAWN_MARGIN * 2
}

function drawTerminalIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save()
  ctx.translate(x, y)
  // Window background
  ctx.fillStyle = '#111111'
  ctx.strokeStyle = '#3d3d3d'
  ctx.lineWidth = 1
  const w = 36, h = 28, r = 2
  ctx.beginPath()
  ctx.roundRect(0, 0, w, h, r)
  ctx.fill()
  ctx.stroke()
  // Title bar
  ctx.fillStyle = '#1a1a1a'
  ctx.beginPath()
  ctx.roundRect(0, 0, w, 7, [r, r, 0, 0])
  ctx.fill()
  // Traffic lights
  ctx.fillStyle = '#ff5555'; ctx.beginPath(); ctx.arc(5, 3.5, 1.2, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#ffaa00'; ctx.beginPath(); ctx.arc(9.5, 3.5, 1.2, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#44ff88'; ctx.beginPath(); ctx.arc(14, 3.5, 1.2, 0, Math.PI * 2); ctx.fill()
  // Prompt
  ctx.fillStyle = '#00ff88'
  ctx.font = 'bold 9px monospace'
  ctx.fillText('>_', 5, 21)
  ctx.restore()
}

function drawStocksIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save()
  ctx.translate(x, y)
  const w = 36, h = 28, r = 2
  ctx.fillStyle = '#111111'
  ctx.strokeStyle = '#3d3d3d'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(0, 0, w, h, r)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#1a1a1a'
  ctx.beginPath()
  ctx.roundRect(0, 0, w, 7, [r, r, 0, 0])
  ctx.fill()
  ctx.fillStyle = '#ff5555'; ctx.beginPath(); ctx.arc(5, 3.5, 1.2, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#ffaa00'; ctx.beginPath(); ctx.arc(9.5, 3.5, 1.2, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#44ff88'; ctx.beginPath(); ctx.arc(14, 3.5, 1.2, 0, Math.PI * 2); ctx.fill()
  // Bar chart
  const bars = [
    { x: 5, h: 7, color: '#00ff88' },
    { x: 12, h: 10, color: '#ff5555' },
    { x: 19, h: 5, color: '#00ff88' },
    { x: 26, h: 9, color: '#00ff88' },
  ]
  bars.forEach(b => {
    ctx.fillStyle = b.color
    ctx.fillRect(b.x, 26 - b.h, 4, b.h)
  })
  ctx.restore()
}

export default function RonakOSDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let frameId: number

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const W = () => canvas.width / (window.devicePixelRatio || 1)
    const H = () => canvas.height / (window.devicePixelRatio || 1)

    const bhX = () => W() * 0.52
    const bhY = () => H() * 0.48
    const BH_RADIUS = 16
    let ringPhase = 0

    let objects: SpaceObject[] = []
    for (let i = 0; i < 2; i++) objects.push(...makeDebrisGroup(W(), H()))
    for (let i = 0; i < 3; i++) objects.push(makeAsteroid(W(), H()))
    objects.push(makePlanet(W(), H()))

    let stars = makeStars(W(), H())
    let lastSpawn = 0

    const loop = (timestamp: number) => {
      const w = W()
      const h = H()
      ctx.clearRect(0, 0, w, h)

      // Background
      ctx.fillStyle = '#0d0d0d'
      ctx.fillRect(0, 0, w, h)

      // Dot grid
      const dotSpacing = 14
      ctx.fillStyle = 'rgba(255,255,255,0.02)'
      for (let x = 0; x < w; x += dotSpacing) {
        for (let y = 0; y < h; y += dotSpacing) {
          ctx.fillRect(x, y, 1, 1)
        }
      }

      // Stars
      stars.forEach(star => {
        star.twinklePhase += star.twinkleSpeed
        star.opacity = star.baseOpacity * (0.5 + 0.5 * Math.sin(star.twinklePhase))
        star.x = ((star.x + star.vx) + w) % w
        star.y = ((star.y + star.vy) + h) % h
        const col = star.warm ? '#fff3d4' : '#d8eeff'
        ctx.save()
        ctx.globalAlpha = star.opacity
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })

      // Spawn objects
      if (timestamp - lastSpawn > 2500) {
        lastSpawn = timestamp
        const roll = Math.random()
        if (roll < 0.35) objects.push(makeAsteroid(w, h))
        else if (roll < 0.55) objects.push(...makeDebrisGroup(w, h))
        else if (roll < 0.7) objects.push(makePlanet(w, h))
        else if (roll < 0.85) objects.push(makeMeteor(w, h))
        else objects.push(makeAsteroid(w, h), makeAsteroid(w, h))
      }

      // Update objects
      objects = objects.filter(obj => {
        // Black hole gravity
        const dx = bhX() - obj.pos.x
        const dy = bhY() - obj.pos.y
        const distSq = dx * dx + dy * dy
        const dist = Math.sqrt(distSq)

        if (dist < BH_RADIUS + 2) return false

        const force = (G * BH_MASS) / (distSq + 200)
        obj.vel.x += (dx / dist) * force
        obj.vel.y += (dy / dist) * force

        // Trail for meteors
        if (obj.trail !== undefined) {
          obj.trail.push({ x: obj.pos.x, y: obj.pos.y })
          if (obj.trail.length > 18) obj.trail.shift()
        }

        obj.pos.x += obj.vel.x
        obj.pos.y += obj.vel.y
        obj.rotation += obj.rotationSpeed

        // Influence zone
        const influence = 80
        if (dist < influence) {
          const inner = 1 - dist / influence
          obj.opacity = Math.max(0, obj.opacity - 0.01 * inner)
          obj.rotationSpeed *= 1.005
        }

        if (obj.opacity <= 0) return false
        if (isOffscreen(obj.pos, w, h)) return false

        // Draw
        ctx.save()
        ctx.globalAlpha = obj.opacity
        ctx.translate(obj.pos.x, obj.pos.y)
        ctx.rotate(obj.rotation)
        ctx.beginPath()
        ctx.moveTo(obj.shape[0].x, obj.shape[0].y)
        for (let i = 1; i < obj.shape.length; i++) ctx.lineTo(obj.shape[i].x, obj.shape[i].y)
        ctx.closePath()
        ctx.strokeStyle = '#00ff88'
        ctx.lineWidth = 0.8
        ctx.stroke()
        ctx.restore()

        return true
      })

      if (objects.length > 30) objects = objects.slice(-30)

      // Black hole glow
      const glow = ctx.createRadialGradient(bhX(), bhY(), BH_RADIUS * 0.5, bhX(), bhY(), BH_RADIUS * 3)
      glow.addColorStop(0, 'rgba(0, 255, 136, 0.08)')
      glow.addColorStop(0.5, 'rgba(0, 255, 136, 0.03)')
      glow.addColorStop(1, 'rgba(0, 255, 136, 0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(bhX(), bhY(), BH_RADIUS * 3, 0, Math.PI * 2)
      ctx.fill()

      // Black hole core
      ctx.beginPath()
      ctx.arc(bhX(), bhY(), BH_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = '#050505'
      ctx.fill()

      // Rings
      ringPhase += 0.007
      const rings = [
        { r: BH_RADIUS + 4, gap: 0.4, op: 0.55, lw: 1.2 },
        { r: BH_RADIUS + 10, gap: 0.7, op: 0.3, lw: 0.8 },
        { r: BH_RADIUS + 18, gap: 1.1, op: 0.15, lw: 0.6 },
      ]
      ctx.strokeStyle = '#00ff88'
      rings.forEach(({ r, gap, op, lw }) => {
        ctx.globalAlpha = op
        ctx.lineWidth = lw
        ctx.beginPath()
        ctx.arc(bhX(), bhY(), r, ringPhase + gap, ringPhase + Math.PI * 2 - gap)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(bhX(), bhY(), r, ringPhase + Math.PI + gap * 0.5, ringPhase + Math.PI * 1.8)
        ctx.stroke()
      })
      ctx.globalAlpha = 1

      // Desktop icons top-left
      drawTerminalIcon(ctx, 14, 14)
      drawStocksIcon(ctx, 14, 52)

      frameId = requestAnimationFrame(loop)
    }

    frameId = requestAnimationFrame(loop)

    const onResize = () => resize()
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <div style={{
      width: '100%',
      aspectRatio: '16/10',
      borderRadius: '10px',
      overflow: 'hidden',
      border: '1px solid #2a2a2a',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      position: 'relative',
    }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  )
}
