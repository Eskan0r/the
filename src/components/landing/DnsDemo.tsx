import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../../lib/motion/gsap'

// DNS proxy demo: 8-bit packet run. Mail leaves your machine, the proxy in
// the middle sinkholes the bad ones and passes the good ones upstream.
// Rendered chunky on purpose: drawn tiny, blitted big, no smoothing.

const LW = 160
const LH = 100
const NODE_Y = 56
const YOU_X = 20
const PROXY_X = 80
const NET_X = 140
const SPEED = 30
const SPAWN_EVERY = 1.25

interface Packet {
  x: number
  bad: boolean
  dying: number // 0 = flying, >0 = intercepted fade progress
  vy: number
}

export default function DnsDemo({ active = true }: { active?: boolean }) {
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
    const c = canvas.getContext('2d')
    if (c) c.setTransform(dpr, 0, 0, dpr, 0, 0)

    const off = document.createElement('canvas')
    off.width = LW
    off.height = LH
    const g = off.getContext('2d')
    if (!g) return
    g.imageSmoothingEnabled = false

    const packets: Packet[] = []
    let spawnIn = 0.4
    let proxyFlash = 0
    let netFlash = 0
    let elapsed = 0

    const spawn = () => {
      packets.push({ x: YOU_X + 12, bad: Math.random() < 0.35, dying: 0, vy: 0 })
    }

    const step = (dt: number) => {
      elapsed += dt
      spawnIn -= dt
      if (spawnIn <= 0) {
        spawnIn = SPAWN_EVERY
        spawn()
      }
      proxyFlash = Math.max(0, proxyFlash - dt)
      netFlash = Math.max(0, netFlash - dt)
      for (let i = packets.length - 1; i >= 0; i -= 1) {
        const p = packets[i]
        if (p.dying > 0) {
          p.dying += dt * 2.2
          if (p.dying >= 1) packets.splice(i, 1)
          continue
        }
        p.x += SPEED * dt
        if (p.x >= PROXY_X && p.x - SPEED * dt < PROXY_X) {
          if (p.bad) {
            p.dying = 0.001
            p.vy = 14
            proxyFlash = 0.5
          }
        }
        if (!p.bad && p.x >= NET_X) {
          netFlash = 0.5
          packets.splice(i, 1)
        }
        if (p.x > LW + 12) packets.splice(i, 1)
      }
    }

    const px = (v: number) => Math.round(v)

    const drawNode = () => {
      // wire
      g.fillStyle = '#b9c2cc'
      for (let x = YOU_X + 14; x < NET_X - 12; x += 4) {
        g.fillRect(x, NODE_Y - 1, 2, 2)
      }
      // you: chunky laptop
      g.fillStyle = '#2b3440'
      g.fillRect(YOU_X - 8, NODE_Y - 14, 16, 12)
      g.fillStyle = '#9fd8ff'
      g.fillRect(YOU_X - 6, NODE_Y - 12, 12, 8)
      g.fillStyle = '#2b3440'
      g.fillRect(YOU_X - 10, NODE_Y - 2, 20, 3)
      // proxy: filter box
      g.fillStyle = proxyFlash > 0 ? '#c0392b' : '#2b3440'
      g.fillRect(PROXY_X - 9, NODE_Y - 16, 18, 20)
      g.fillStyle = '#f5f1e6'
      g.fillRect(PROXY_X - 6, NODE_Y - 13, 12, 8)
      g.fillStyle = proxyFlash > 0 ? '#ff5a5a' : '#3ddc84'
      g.fillRect(PROXY_X - 2, NODE_Y - 11, 4, 4)
      g.fillStyle = '#2b3440'
      g.fillRect(PROXY_X - 9, NODE_Y + 4, 18, 3)
      // upstream: server tower
      g.fillStyle = '#2b3440'
      g.fillRect(NET_X - 7, NODE_Y - 20, 14, 24)
      for (let i = 0; i < 3; i += 1) {
        g.fillStyle = netFlash > 0 && i === 1 ? '#3ddc84' : '#5a6675'
        g.fillRect(NET_X - 4, NODE_Y - 17 + i * 6, 8, 3)
      }
    }

    const drawPacket = (p: Packet) => {
      const X = px(p.x)
      const Y = px(NODE_Y - 8 + (p.dying > 0 ? p.dying * 16 : 0))
      const alpha = p.dying > 0 ? 1 - p.dying : 1
      g.globalAlpha = Math.max(0, alpha)
      if (p.dying > 0) {
        // intercepted: red X falling apart
        g.fillStyle = '#c0392b'
        g.fillRect(X - 4, Y - 3, 3, 3)
        g.fillRect(X + 1, Y - 3, 3, 3)
        g.fillRect(X - 4, Y + 1, 3, 3)
        g.fillRect(X + 1, Y + 1, 3, 3)
        g.fillRect(X - 1, Y - 1, 2, 3)
      } else {
        const body = p.bad ? '#e8b4b4' : '#f5f1e6'
        const edge = p.bad ? '#c0392b' : '#2b3440'
        g.fillStyle = edge
        g.fillRect(X - 5, Y - 4, 10, 8)
        g.fillStyle = body
        g.fillRect(X - 4, Y - 3, 8, 6)
        g.fillStyle = edge
        g.fillRect(X - 4, Y - 3, 2, 1)
        g.fillRect(X + 2, Y - 3, 2, 1)
        g.fillRect(X - 1, Y - 2, 2, 1)
        g.fillRect(X - 2, Y - 1, 4, 1)
      }
      g.globalAlpha = 1
    }

    const draw = () => {
      g.clearRect(0, 0, LW, LH)
      g.fillStyle = '#eef2f6'
      g.fillRect(0, 0, LW, LH)
      drawNode()
      packets.forEach(drawPacket)

      ctx.clearRect(0, 0, w, h)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(off, 0, 0, w, h)

      ctx.font = "600 10px 'JetBrains Mono', monospace"
      ctx.fillStyle = '#8a94a0'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const labelY = (NODE_Y / LH) * h + 27
      ctx.fillText('YOU', (YOU_X / LW) * w, labelY)
      ctx.fillText('PROXY', (PROXY_X / LW) * w, labelY)
      ctx.fillText('SERVER', (NET_X / LW) * w, labelY)
    }

    if (reduced) {
      packets.push({ x: YOU_X + 30, bad: false, dying: 0, vy: 0 })
      packets.push({ x: PROXY_X - 14, bad: true, dying: 0, vy: 0 })
      draw()
      return
    }

    let raf = 0
    let running = false
    if (!active) {
      draw()
      return
    }
    running = true
    let last = performance.now()
    const frame = (now: number) => {
      if (!running) return
      raf = requestAnimationFrame(frame)
      const dt = Math.min(Math.max((now - last) / 1000, 0), 1 / 30)
      last = now
      if (dt > 0) step(dt)
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
