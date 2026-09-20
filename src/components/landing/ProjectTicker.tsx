import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import BSGDemo from './BSGDemo'
import RonakOSDemo from './RonakOSDemo'
import { PROJECTS, type Project } from '../../data/projects'

/* ─────────────────────────────────────────────────────────────
   "The Wire" — infinite project ticker (right to left).

   - Track holds two identical halves; translating -50% loops
     seamlessly. Gap lives INSIDE cards (margin-right) so both
     halves stay pixel-identical (no seam twitch).
   - Duration is measured from content width → constant px/s
     no matter how many projects get added.
   - Pauses on hover, keyboard focus, and touch-hold. The dup
     half is aria-hidden and non-interactive (no double tab
     stops / announcements).
   - Each card's live sim only runs while the card is on screen
     (IntersectionObserver → demo `active` prop).
   - Reduced motion: static stacked grid, dup half hidden.
   ───────────────────────────────────────────────────────────── */

const SPEED_PX_S = 70
// repeat the set enough times that one half always exceeds the viewport
const REPEAT = 4

function Demo({ kind, active }: { kind: Project['demo']; active: boolean }) {
  if (kind === 'bsg') return <BSGDemo active={active} />
  if (kind === 'ronakos') return <RonakOSDemo active={active} />
  return (
    <div className="ticker-poster" aria-hidden="true">
      <span className="ticker-poster-text">soon</span>
    </div>
  )
}

function ProjectCard({ p, interactive }: { p: Project; interactive: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const body = (
    <>
      <div className="ticker-demo">
        <Demo kind={p.demo} active={visible} />
      </div>
      <div className="ticker-info">
        <span className="ticker-badge" style={{ color: p.accent }}>
          {p.index}
        </span>
        <h2 className="ticker-title">{p.title}</h2>
        <p className="ticker-desc">{p.desc}</p>
        <div className="ticker-tags">
          {p.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
    </>
  )

  return (
    <div ref={ref} className="ticker-card" {...(!interactive ? { 'aria-hidden': true } : {})}>
      {interactive ? (
        <a href={p.href} target="_blank" rel="noopener noreferrer">
          {body}
        </a>
      ) : (
        body
      )}
    </div>
  )
}

function Copy({ interactive }: { interactive: boolean }) {
  const cards: ReactNode[] = []
  for (let r = 0; r < REPEAT; r++) {
    for (const p of PROJECTS) {
      cards.push(<ProjectCard key={`${p.id}-${r}`} p={p} interactive={interactive} />)
    }
  }
  return <>{cards}</>
}

export default function ProjectTicker() {
  const trackRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [duration, setDuration] = useState(40)
  const [touching, setTouching] = useState(false)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const update = () => {
      const half = track.scrollWidth / 2
      if (half > 0) setDuration(half / SPEED_PX_S)
    }
    update()
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(update)
      ro.observe(track)
      return () => ro.disconnect()
    }
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Clicking a card opens a new tab; the link keeps focus, which would
  // hold the ticker paused (via :focus-within) after coming back.
  // Drop focus only if it's inside the ticker, so keyboard users
  // tabbing elsewhere are unaffected.
  useEffect(() => {
    const releaseFocus = () => {
      const vp = viewportRef.current
      const active = document.activeElement as HTMLElement | null
      if (vp && active && vp.contains(active)) active.blur()
    }
    const onVis = () => {
      if (!document.hidden) releaseFocus()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', releaseFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', releaseFocus)
    }
  }, [])

  return (
    <section className="projects-section" aria-label="Selected work">
      <div
        ref={viewportRef}
        className={`ticker-viewport${touching ? ' is-touching' : ''}`}
        onTouchStart={() => setTouching(true)}
        onTouchEnd={() => setTouching(false)}
        onTouchCancel={() => setTouching(false)}
      >
        <div
          ref={trackRef}
          className="ticker-track"
          style={{ '--ticker-duration': `${duration}s` } as CSSProperties}
        >
          <Copy interactive />
          <span className="ticker-copy-dup" aria-hidden="true" style={{ display: 'contents' }}>
            <Copy interactive={false} />
          </span>
        </div>
      </div>
    </section>
  )
}
