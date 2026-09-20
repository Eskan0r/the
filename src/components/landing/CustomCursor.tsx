import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/* Hand artwork: "pointer" from mocu-xcursor by sevmeyer
   (https://github.com/sevmeyer/mocu-xcursor), released under
   CC0-1.0. Path restyled here (dark fill, light outline) to
   match this site's cursor set. Hotspot (7, 2). */
const HAND_D =
  'm7 2a1 1 0 0 0-1 1v11h-1v-4.5l-2 2c-0.5 0.5-0.5 1-0.25 1.5l2 4h9.5l1.75-3.5v-3.5a1 1 0 0 0-1-1v2h-1v-3a1 1 0 0 0-1-1h-1v3h-1v-3a1 1 0 0 0-1-1h-1v4h-1v-7a1 1 0 0 0-1-1z'
const HAND_PATH = new Path2D(HAND_D)

/* ─────────────────────────────────────────────────────────────
   CustomCursor — a pixel-faithful replica of the native arrow
   cursor, drawn as DOM content so the liquid glass can refract
   it (the true OS cursor lives above the page and can never be
   captured by any website).

   Two fullscreen canvases, one rAF loop, mutually exclusive:
   - hero canvas: direct child of the liquidglass root, z 1
     (below the name panel), data-dynamic → refracts through
     the glass like everything else
   - page canvas: z 50, sampled by nothing → crisp cursor
     everywhere below the hero (the projects band is opaque,
     a z-1 cursor would vanish behind it)
   Each frame draws on exactly one, chosen by hit-testing the
   pointer against the hero section.

   Active only with a fine pointer and no reduced-motion
   preference; adds .has-custom-cursor (which hides the OS
   cursor) only in that case. Touch devices are untouched.
   ───────────────────────────────────────────────────────────── */

export default function CustomCursor() {
  const heroRef = useRef<HTMLCanvasElement | null>(null)
  const pageRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || calm) return
    const heroOrNull = heroRef.current
    const pageOrNull = pageRef.current
    if (!heroOrNull || !pageOrNull) return
    const hero: HTMLCanvasElement = heroOrNull
    const page: HTMLCanvasElement = pageOrNull
    const hctx = hero.getContext('2d')
    const pctx = page.getContext('2d')
    if (!hctx || !pctx) return

    const landing = document.querySelector('.landing-page')
    landing?.classList.add('has-custom-cursor')

    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      for (const c of [hero, page]) {
        c.width = Math.round(window.innerWidth * dpr)
        c.height = Math.round(window.innerHeight * dpr)
      }
    }
    size()

    let mx = -100
    let my = -100
    let seen = false
    let inside = false
    let dx = -100
    let dy = -100
    let hover = false
    let raf = 0
    let running = true

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return
      mx = e.clientX
      my = e.clientY
      seen = true
      inside = true
    }
    const onLeave = () => {
      inside = false
    }
    const onOver = (e: MouseEvent) => {
      hover = !!(e.target as HTMLElement | null)?.closest?.('a,button')
    }

    window.addEventListener('pointermove', onMove)
    document.documentElement.addEventListener('pointerleave', onLeave)
    window.addEventListener('mouseover', onOver)
    window.addEventListener('resize', size)

    const heroSection = document.querySelector('.hero-section')

    // Pointing-hand cursor from the mocu set above: soft shadow,
    // light outline, dark body. Translated so the hotspot (7, 2)
    // lands exactly on the pointer.
    const drawHand = (ctx: CanvasRenderingContext2D) => {
      ctx.save()
      ctx.lineJoin = 'round'
      ctx.translate(dx - 7 + 1, dy - 2 + 1)
      ctx.lineWidth = 2
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'
      ctx.fill(HAND_PATH)
      ctx.stroke(HAND_PATH)
      ctx.translate(-1, -1)
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.stroke(HAND_PATH)
      ctx.fillStyle = '#111111'
      ctx.fill(HAND_PATH)
      ctx.restore()
    }

    // Classic arrow cursor silhouette; the tip (hotspot) sits
    // exactly on the pointer like the native cursor.
    const draw = (ctx: CanvasRenderingContext2D) => {
      if (hover) {
        drawHand(ctx)
        return
      }
      ctx.save()
      ctx.translate(dx, dy)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, 16)
      ctx.lineTo(4.8, 12.2)
      ctx.lineTo(7.2, 18)
      ctx.lineTo(9.6, 17)
      ctx.lineTo(7.2, 11.4)
      ctx.lineTo(12, 11.4)
      ctx.closePath()
      ctx.fillStyle = '#111111'
      ctx.fill()
      ctx.lineWidth = 1.4
      ctx.lineJoin = 'round'
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.stroke()
      ctx.restore()
    }

    const frame = (now: number) => {
      if (!running) return
      raf = requestAnimationFrame(frame)
      // 1:1 tracking, zero lag — identical feel to the native cursor
      dx = mx
      dy = my

      for (const ctx of [hctx, pctx]) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      }
      if (!seen || !inside) return
      const r = heroSection?.getBoundingClientRect()
      const inHero = !!r && my >= r.top && my <= r.bottom
      draw(inHero ? hctx : pctx)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('mouseover', onOver)
      window.removeEventListener('resize', size)
      landing?.classList.remove('has-custom-cursor')
    }
  }, [])

  // NOTE: the page canvas is portalled to document.body. The hero
  // section creates a stacking context (z-index: 1), so anything
  // fixed inside it — even at z 50 — paints below the opaque
  // projects band (z-index: 3). At body level it floats above all.
  return (
    <>
      <canvas
        ref={heroRef}
        data-dynamic
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      {createPortal(
        <canvas
          ref={pageRef}
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 50,
          }}
        />,
        document.body,
      )}
    </>
  )
}
