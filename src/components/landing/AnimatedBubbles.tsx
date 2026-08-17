import { useEffect, useRef, useCallback } from 'react'

interface Bubble {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  hue: number
  opacity: number
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
    const BASE_SPEED = 0.7
    const MAX_BUBBLES = 60
    const SPAWN_INTERVAL = 600

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const spawnBubble = () => {
      const w = canvas.width
      const h = canvas.height

      // Spawn from off-screen: bottom edge or left edge
      const fromBottom = Math.random() < 0.5
      let sx: number, sy: number

      if (fromBottom) {
        sx = Math.random() * w * 1.2 - w * 0.1
        sy = h + BUBBLE_RADIUS
      } else {
        sx = -BUBBLE_RADIUS
        sy = Math.random() * h * 1.2 - h * 0.1
      }

      // Direction: anywhere from straight right (0) to straight up (-PI/2)
      // That's the upper-right quadrant: angle between -PI/2 and 0
      const angle = -Math.random() * (Math.PI / 2) // -90deg to 0deg
      const speed = BASE_SPEED * (0.5 + Math.random() * 1.0)

      bubbles.push({
        x: sx,
        y: sy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: BUBBLE_RADIUS,
        hue: colors[Math.floor(Math.random() * colors.length)] + Math.random() * 30,
        opacity: 0.3,
      })
    }

    let lastSpawnTime = -SPAWN_INTERVAL - 100

    const loop = (now: number) => {
      tick = now

      if (now - lastSpawnTime >= SPAWN_INTERVAL && bubbles.length < MAX_BUBBLES) {
        spawnBubble()
        lastSpawnTime = now
      }

      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i]
        b.x += b.vx
        b.y += b.vy

        // Remove when far off-screen (top or right)
        if (b.x < -BUBBLE_RADIUS * 4 || b.x > canvas.width + BUBBLE_RADIUS * 4 ||
            b.y < -BUBBLE_RADIUS * 4 || b.y > canvas.height + BUBBLE_RADIUS * 4) {
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
