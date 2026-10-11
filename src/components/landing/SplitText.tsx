import { Fragment, useLayoutEffect, useRef } from 'react'
import type { ElementType } from 'react'
import { gsap, ScrollTrigger, prefersReducedMotion } from '../../lib/motion/gsap'
import './text.css'

export interface SplitTextProps {
  text: string
  as?: ElementType
  className?: string
  wordClassName?: string
  delay?: number
  stagger?: number
  once?: boolean
  start?: string
}

export default function SplitText({
  text,
  as: Tag = 'span',
  className,
  wordClassName,
  delay = 0,
  stagger = 0.045,
  once = true,
  start = 'top 85%',
}: SplitTextProps): JSX.Element {
  const ref = useRef<HTMLElement | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion()) return

    const targets = el.querySelectorAll<HTMLElement>('.split-word-inner')
    if (!targets.length) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { yPercent: 110, autoAlpha: 0 },
        {
          yPercent: 0,
          autoAlpha: 1,
          duration: 0.8,
          delay,
          stagger,
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
  }, [text, delay, stagger, once, start])

  if (prefersReducedMotion()) {
    return (
      <Tag ref={ref} className={className} aria-label={text}>
        {text}
      </Tag>
    )
  }

  const words = text.split(' ')
  const rootClass = className ? `split-text ${className}` : 'split-text'

  return (
    <Tag ref={ref} className={rootClass} aria-label={text}>
      {words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          <span
            className={wordClassName ? `split-word ${wordClassName}` : 'split-word'}
            aria-hidden="true"
          >
            <span className="split-word-inner">{word}</span>
          </span>
          {index < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Tag>
  )
}
