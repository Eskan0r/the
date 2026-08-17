import { useEffect, useRef, useCallback } from 'react'

interface Bubble {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  hue: number
  opacity: number
  entered: boolean
}

export default function AnimatedBubbles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, bubbles: Bubble[], tick: number) => {
    ctx.clearRect(0, 0, w, h)

    for (const b of bubbles) {
      const { x, y, radius, hue, opacity } = b
      const lit = 55 + Math.sin(tick * 0.001 + hue) * 5

      const col = (a: number) => `hsl(${hue}deg 80% ${lit}% / ${a * opacity})`

      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius)
      grad.addColorStop(0, col(0))
      grad.addColorStop(0.3, col(0.02))
      grad.addColorStop(0.6, col(0.08))
      grad.addColorStop(0.8, col(0.2))
      grad.addColorStop(0.92, col(0.5))
      grad.addColorStop(0.97, col(0.7))
      grad.addColorStop(1, col(0.85))

      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()

      const specGrad = ctx.createRadialGradient(
        x - radius * 0.3, y - radius * 0.35, 0,
        x - radius * 0.3, y - radius * 0.35, radius * 0.35
      )
      specGrad.addColorStop(0, `rgba(255,255,255,${0.35 * opacity})`)
      specGrad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = specGrad
      ctx.beginPath()
      ctx.ellipse(x - radius * 0.25, y - radius * 0.3, radius * 0.3, radius * 0.15, -0.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = `rgba(255,255,255,${0.7 * opacity})`
      ctx.beginPath()
      ctx.ellipse(x - radius * 0.4, y - radius * 0.45, radius * 0.06, radius * 0.14, -0.7, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')!
    let bubbles: Bubble[] = []
    let frameId: number
    let tick = 0

    const colors = [200, 160, 45, 340, 270, 120, 30, 210]
    const BUBBLE_RADIUS = 80
    const BASE_SPEED = 1
    const MAX_BUBBLES = 100
    const SPAWN_INTERVAL = 400
    const NUM_POINTS = 3
    const CLUSTER_RADIUS = 80
    const ORBIT_MULTIPLIER = 1.6
    let spawnAngle = Math.PI * 0.85
    let nextPoint = 0
    let lastPoint = -1

    const spawnPoints = Array.from({ length: NUM_POINTS }, (_, i) => {
      const t = (i / (NUM_POINTS - 1)) - 0.5
      return { ox: t * CLUSTER_RADIUS * 2, oy: 0 }
    })

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const spawnBubble = (pointIdx: number) => {
      const w = canvas.width
      const h = canvas.height
      const cx = w / 2
      const cy = h / 2
      const orbitRadius = Math.sqrt(cx * cx + cy * cy) * ORBIT_MULTIPLIER

      const baseX = cx + Math.cos(spawnAngle) * orbitRadius
      const baseY = cy + Math.sin(spawnAngle) * orbitRadius

      const pt = spawnPoints[pointIdx]
      const cos = Math.cos(spawnAngle)
      const sin = Math.sin(spawnAngle)
      const rx = pt.ox * cos - pt.oy * sin
      const ry = pt.ox * sin + pt.oy * cos
      const sx = baseX + rx
      const sy = baseY + ry

      const dx = w - sx
      const dy = h * 0.8 - sy
      const len = Math.sqrt(dx * dx + dy * dy)
      const dirX = dx / len
      const dirY = dy / len

      const spread = 0.8
      const dirAngle = Math.atan2(dirY, dirX)
      const centerAngle = Math.atan2(cy - sy, cx - sx)
      const biased = dirAngle + (centerAngle - dirAngle) * 0.15
      const a = biased + (Math.random() - 0.95) * spread
      const speed = BASE_SPEED * (0.7 + Math.random() * 1.2)

      bubbles.push({
        x: sx + (Math.random() - 0.5) * 20,
        y: sy + (Math.random() - 0.5) * 20,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        radius: BUBBLE_RADIUS,
        hue: colors[Math.floor(Math.random() * colors.length)] + Math.random() * 30,
        // opacity: Math.random() * 0.15 + 0.1,
        opacity: 0.3,
        entered: false,
      })
    }

    let lastSpawnTime = -SPAWN_INTERVAL - 100

    const loop = (now: number) => {
      tick = now

      if (now - lastSpawnTime >= SPAWN_INTERVAL && bubbles.length < MAX_BUBBLES) {
        do {
          nextPoint = Math.floor(Math.random() * NUM_POINTS)
        } while (nextPoint === lastPoint)
        lastPoint = nextPoint
        spawnBubble(nextPoint)
        lastSpawnTime = now
      }

      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i]
        b.x += b.vx
        b.y += b.vy

        if (!b.entered && b.x > 0 && b.x < canvas.width && b.y > 0 && b.y < canvas.height) {
          b.entered = true
        }

        const farOffScreen = b.x < -BUBBLE_RADIUS * 40 || b.x > canvas.width + BUBBLE_RADIUS * 40 || b.y < -BUBBLE_RADIUS * 40 || b.y > canvas.height + BUBBLE_RADIUS * 40
        if (farOffScreen || (b.entered && (b.x > canvas.width + BUBBLE_RADIUS * 4 || b.y < -BUBBLE_RADIUS * 4 || b.y > canvas.height + BUBBLE_RADIUS * 4 || b.x < -BUBBLE_RADIUS * 4))) {
          bubbles.splice(i, 1)
        }
      }

      draw(ctx, canvas.width, canvas.height, bubbles, tick)
      frameId = requestAnimationFrame(loop)
    }

    frameId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
    }
  }, [draw])

  return (
    <canvas
      ref={canvasRef as React.RefObject<HTMLCanvasElement>}
      data-dynamic
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}
