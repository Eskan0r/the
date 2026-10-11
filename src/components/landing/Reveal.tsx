import { useLayoutEffect, useRef } from 'react'
import type { ReactNode, ElementType, CSSProperties } from 'react'
import { gsap, ScrollTrigger, prefersReducedMotion } from '../../lib/motion/gsap'

export interface RevealProps {
  children: React.ReactNode
  className?: string
  as?: React.ElementType
  delay?: number
  y?: number
  duration?: number
  once?: boolean
  start?: string
  style?: React.CSSProperties
}

export default function Reveal({
  children,
  className,
  as: Tag = 'div',
  delay = 0,
  y = 24,
  duration = 0.9,
  once = true,
  start = 'top 85%',
  style,
}: RevealProps): JSX.Element {
  const ref = useRef<HTMLElement | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    if (prefersReducedMotion()) {
      gsap.set(el, { autoAlpha: 1, y: 0, clearProps: 'transform' })
      return
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y },
        {
          autoAlpha: 1,
          y: 0,
          duration,
          delay,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start,
            once,
            toggleActions: once ? 'play none none none' : 'play none none reverse',
          },
        }
      )
    }, el)

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger.trigger === el) trigger.kill()
      })
      ctx.revert()
    }
  }, [delay, y, duration, once, start])

  return (
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  )
}
