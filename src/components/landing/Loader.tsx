import { useEffect, useRef } from 'react'
import { gsap, prefersReducedMotion } from '../../lib/motion/gsap'
import './polish.css'

export interface LoaderProps {
  onDone?: () => void
}

export default function Loader({ onDone }: LoaderProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  const countRef = useRef<HTMLSpanElement>(null)

  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    const root = rootRef.current
    const line = lineRef.current
    const count = countRef.current
    if (!root) return

    let called = false
    const finish = () => {
      if (called) return
      called = true
      onDoneRef.current?.()
    }

    const tl = gsap.timeline({ onComplete: finish })

    if (prefersReducedMotion()) {
      gsap.set(root, { clipPath: 'inset(0% 0% 0% 0%)', autoAlpha: 1 })
      if (line) gsap.set(line, { scaleX: 1 })
      if (count) count.textContent = '100'
      tl.to(root, { autoAlpha: 0, duration: 0.18, ease: 'power2.out' })
    } else {
      const state = { v: 0 }
      gsap.set(root, { clipPath: 'inset(0% 0% 0% 0%)', autoAlpha: 1 })
      if (line) gsap.set(line, { scaleX: 0 })

      tl.to(state, {
        v: 100,
        duration: 1,
        ease: 'power2.inOut',
        onUpdate: () => {
          if (line) gsap.set(line, { scaleX: state.v / 100 })
          if (count) count.textContent = String(Math.round(state.v))
        },
      })
      tl.to(root, {
        clipPath: 'inset(0% 0% 100% 0%)',
        duration: 0.7,
        ease: 'power3.inOut',
      })
    }

    return () => {
      tl.kill()
    }
  }, [])

  return (
    <div ref={rootRef} className="site-loader" role="status" aria-label="Loading site">
      <span
        className="site-loader__mark"
        aria-hidden="true"
        style={{ fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace" }}
      >
        RC
      </span>
      <div className="loader-line" aria-hidden="true">
        <div ref={lineRef} className="loader-line__fill" />
      </div>
      <span
        ref={countRef}
        className="loader-count"
        aria-hidden="true"
        style={{ fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace" }}
      >
        0
      </span>
    </div>
  )
}
