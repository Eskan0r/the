import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger, prefersReducedMotion } from '../../lib/motion/gsap'
import './polish.css'

export default function ScrollProgress(): JSX.Element {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return

    gsap.set(bar, { scaleX: 0, opacity: 0 })

    const tween = gsap.to(bar, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: prefersReducedMotion() ? 0 : 0.35,
        onUpdate: (self) => {
          gsap.set(bar, { opacity: self.progress > 0.001 ? 1 : 0 })
        },
      },
    })

    const st: ScrollTrigger | undefined = tween.scrollTrigger

    return () => {
      st?.kill()
      tween.kill()
    }
  }, [])

  return <div ref={barRef} className="scroll-progress" aria-hidden="true" />
}
