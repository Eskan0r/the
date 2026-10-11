import { useEffect, useRef, type ReactNode } from 'react'
import { gsap, prefersReducedMotion } from '../../lib/motion/gsap'
import './polish.css'

export interface MagneticButtonProps {
  children: ReactNode
  href?: string
  onClick?: () => void
  className?: string
  strength?: number
  target?: string
  ariaLabel?: string
}

const MAX_OFFSET = 10
const HIT_MARGIN = 90
const LABEL_LAG = 0.4

export default function MagneticButton({
  children,
  href,
  onClick,
  className,
  strength = 0.35,
  target,
  ariaLabel,
}: MagneticButtonProps): JSX.Element {
  const rootRef = useRef<HTMLElement | null>(null)
  const labelRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    if (prefersReducedMotion()) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    const inner = labelRef.current
    const xTo = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3' })
    const ixTo = inner ? gsap.quickTo(inner, 'x', { duration: 0.7, ease: 'power3' }) : null
    const iyTo = inner ? gsap.quickTo(inner, 'y', { duration: 0.7, ease: 'power3' }) : null

    let active = false

    const rest = () => {
      active = false
      xTo(0)
      yTo(0)
      ixTo?.(0)
      iyTo?.(0)
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const within =
        e.clientX >= r.left - HIT_MARGIN &&
        e.clientX <= r.right + HIT_MARGIN &&
        e.clientY >= r.top - HIT_MARGIN &&
        e.clientY <= r.bottom + HIT_MARGIN
      if (!within) {
        if (active) rest()
        return
      }
      active = true
      const tx = gsap.utils.clamp(-MAX_OFFSET, MAX_OFFSET, (e.clientX - cx) * strength)
      const ty = gsap.utils.clamp(-MAX_OFFSET, MAX_OFFSET, (e.clientY - cy) * strength)
      xTo(tx)
      yTo(ty)
      ixTo?.(tx * LABEL_LAG)
      iyTo?.(ty * LABEL_LAG)
    }

    window.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', rest)
    window.addEventListener('blur', rest)

    return () => {
      window.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', rest)
      window.removeEventListener('blur', rest)
      gsap.killTweensOf(el)
      if (inner) gsap.killTweensOf(inner)
    }
  }, [strength])

  const classes = className ? `magnetic ${className}` : 'magnetic'
  const content = (
    <span ref={labelRef} className="magnetic__inner">
      {children}
    </span>
  )

  if (href) {
    return (
      <a
        ref={(node) => {
          rootRef.current = node
        }}
        href={href}
        target={target}
        rel={target === '_blank' ? 'noopener noreferrer' : undefined}
        className={classes}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        {content}
      </a>
    )
  }

  return (
    <button
      ref={(node) => {
        rootRef.current = node
      }}
      type="button"
      className={classes}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {content}
    </button>
  )
}
