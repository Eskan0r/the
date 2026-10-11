import { useCallback, useEffect, useRef } from 'react'
import type { ElementType } from 'react'
import { gsap, prefersReducedMotion } from '../../lib/motion/gsap'
import './text.css'

export interface ScrambleTextProps {
  text: string
  as?: ElementType
  className?: string
  duration?: number
  trigger?: 'hover' | 'mount' | 'inview'
  characters?: string
}

type TickerFn = (time: number, deltaTime: number, frame: number) => void

const DEFAULT_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!<>-_\\/[]{}=+*^?#'

export default function ScrambleText({
  text,
  as: Tag = 'span',
  className,
  duration = 0.6,
  trigger = 'hover',
  characters = DEFAULT_CHARACTERS,
}: ScrambleTextProps): JSX.Element {
  const ref = useRef<HTMLElement | null>(null)
  const liveRef = useRef<HTMLSpanElement | null>(null)
  const tickRef = useRef<TickerFn | null>(null)

  const stop = useCallback(() => {
    if (tickRef.current) {
      gsap.ticker.remove(tickRef.current)
      tickRef.current = null
    }
    if (liveRef.current) {
      liveRef.current.textContent = text
    }
  }, [text])

  const run = useCallback(() => {
    const live = liveRef.current
    if (!live) return

    if (tickRef.current) {
      gsap.ticker.remove(tickRef.current)
      tickRef.current = null
    }

    if (!text) {
      live.textContent = ''
      return
    }

    const pool = characters.length > 0 ? characters : DEFAULT_CHARACTERS
    const totalFrames = Math.max(1, Math.round(duration * 60))
    let frame = 0

    const tick: TickerFn = () => {
      frame += 1
      const progress = Math.min(1, frame / totalFrames)

      if (progress >= 1) {
        live.textContent = text
        if (tickRef.current) {
          gsap.ticker.remove(tickRef.current)
          tickRef.current = null
        }
        return
      }

      const revealed = Math.floor(progress * text.length)
      let output = ''
      for (let i = 0; i < text.length; i += 1) {
        const char = text.charAt(i)
        if (char === ' ') {
          output += ' '
        } else if (i < revealed) {
          output += char
        } else {
          output += pool.charAt(Math.floor(Math.random() * pool.length))
        }
      }
      live.textContent = output
    }

    tickRef.current = tick
    gsap.ticker.add(tick)
  }, [text, characters, duration])

  useEffect(() => {
    if (prefersReducedMotion()) return undefined

    if (trigger === 'mount') {
      run()
      return () => stop()
    }

    if (trigger === 'inview') {
      const el = ref.current
      if (!el) return undefined
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) run()
          }
        },
        { threshold: 0.2 }
      )
      observer.observe(el)
      return () => {
        observer.disconnect()
        stop()
      }
    }

    return () => stop()
  }, [trigger, run, stop])

  if (prefersReducedMotion()) {
    return (
      <Tag ref={ref} className={className}>
        {text}
      </Tag>
    )
  }

  const rootClass = className ? `scramble ${className}` : 'scramble'

  return (
    <Tag
      ref={ref}
      className={rootClass}
      aria-label={text}
      onPointerEnter={trigger === 'hover' ? run : undefined}
    >
      <span className="scramble-ghost" aria-hidden="true">
        {text}
      </span>
      <span ref={liveRef} className="scramble-live" aria-hidden="true">
        {text}
      </span>
    </Tag>
  )
}
