import { useEffect, useMemo, useRef } from 'react'
import { generateLevel } from '../../lib/roflow/flow-generator'
import { prefersReducedMotion } from '../../lib/motion/gsap'

// Live roflow demo: generates a REAL puzzle with the vendored roflow
// generator (same seeded Hamiltonian-snake + backbite code as the game),
// then draws the true solution paths one pipe at a time, on loop.

const COLORS = ['#ff5a5a', '#ffb020', '#3ddc84', '#4fc3f7', '#b388ff', '#f472b6']
const SEED = 'ronak-ticker'
const SIZE = 6
const REVEAL_PER_CELL = 0.085
const HOLD_AFTER = 1.6

export default function RoflowDemo({ active = true }: { active?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const level = useMemo(() => {
    try {
      return generateLevel(SEED, SIZE)
    } catch {
      return null
    }
  }, [])

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

    if (!level || level.solution.length === 0) {
      ctx.fillStyle = '#0e1319'
      ctx.fillRect(0, 0, w, h)
      return
    }

    const pad = 20
    const cell = Math.min((w - pad * 2) / SIZE, (h - pad * 2) / SIZE)
    const ox = (w - cell * SIZE) / 2
    const oy = (h - cell * SIZE) / 2
    const cx = (col: number) => ox + (col + 0.5) * cell
    const cy = (row: number) => oy + (row + 0.5) * cell

    const paths = level.solution
    const totalReveal = paths.reduce((a, p) => a + p.length * REVEAL_PER_CELL, 0)
    const total = totalReveal + HOLD_AFTER

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#0e1319'
      ctx.fillRect(0, 0, w, h)

      ctx.fillStyle = 'rgba(255,255,255,0.10)'
      for (let r = 0; r < SIZE; r += 1) {
        for (let q = 0; q < SIZE; q += 1) {
          ctx.beginPath()
          ctx.arc(cx(q), cy(r), 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      level.pairs.forEach(([a, b], i) => {
        ctx.fillStyle = COLORS[i % COLORS.length]
        const ends: Array<[number, number]> = [
          [a[0], a[1]],
          [b[0], b[1]],
        ]
        ends.forEach(([r, q]) => {
          ctx.beginPath()
          ctx.arc(cx(q), cy(r), cell * 0.26, 0, Math.PI * 2)
          ctx.fill()
        })
      })

      let start = 0
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = cell * 0.38
      paths.forEach((path, i) => {
        const dur = path.length * REVEAL_PER_CELL
        const local = t - start
        start += dur
        if (local <= 0 || path.length === 0) return
        const count = Math.min(path.length, Math.floor(local / REVEAL_PER_CELL) + 1)
        ctx.strokeStyle = COLORS[i % COLORS.length]
        ctx.beginPath()
        path.slice(0, count).forEach(([r, q], k) => {
          if (k === 0) ctx.moveTo(cx(q), cy(r))
          else ctx.lineTo(cx(q), cy(r))
        })
        ctx.stroke()
      })
    }

    let raf = 0
    let running = false
    if (reduced || !active) {
      draw(total)
      return
    }
    running = true
    const t0 = performance.now()
    const frame = (now: number) => {
      if (!running) return
      raf = requestAnimationFrame(frame)
      draw((((now - t0) / 1000) % total + total) % total)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      running = false
      cancelAnimationFrame(raf)
    }
  }, [active, level])

  return <canvas ref={canvasRef} className="ticker-demo-canvas" aria-hidden="true" />
}
