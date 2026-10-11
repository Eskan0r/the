import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import BSGDemo from './BSGDemo'
import RonakOSDemo from './RonakOSDemo'
import DeepRacerDemo from './DeepRacerDemo'
import DnsDemo from './DnsDemo'
import RoflowDemo from './RoflowDemo'
import SentenceDemo from './SentenceDemo'
import SlackBotDemo from './SlackBotDemo'
import TohDemo from './TohDemo'
import { PROJECTS, type Project } from '../../data/projects'
import { prefersReducedMotion } from '../../lib/motion/gsap'

/* ─────────────────────────────────────────────────────────────
   "The Wire" — infinite project ticker (right to left).

   Motion is driven in JS (requestAnimationFrame) so the end arrows can
   advance exactly one project and the cards can squash-and-stretch on a
   travelling wave. The track holds two identical halves; the offset wraps
   at half-width for a seamless loop.

   - Pauses on hover, keyboard focus, and touch-hold.
   - End arrows step one card at a time (no speed-up).
   - Each card has a staggered squash-and-stretch bob for a bouncy feel.
   - Reduced motion: static stacked grid.
   ───────────────────────────────────────────────────────────── */

const SPEED_PX_S = 70 // idle drift speed
const NAV_PX_S = 760 // speed while an arrow is advancing one project

function Demo({ kind, active }: { kind: Project['demo']; active: boolean }) {
  if (kind === 'bsg') return <BSGDemo active={active} />
  if (kind === 'ronakos') return <RonakOSDemo active={active} />
  if (kind === 'deepracer') return <DeepRacerDemo active={active} />
  if (kind === 'dns') return <DnsDemo active={active} />
  if (kind === 'roflow') return <RoflowDemo active={active} />
  if (kind === 'sentence') return <SentenceDemo active={active} />
  if (kind === 'slackbot') return <SlackBotDemo active={active} />
  if (kind === 'toh') return <TohDemo />
  return null
}

function ProjectCard({ project, active, phase, interactive, advancing }: {
  project: Project
  active: boolean
  phase: number
  interactive: boolean
  advancing: boolean
}) {
  const body = (
    <>
      <div className="ticker-demo">
        <Demo kind={project.demo} active={active} />
      </div>
      <div className="ticker-info">
        <span className="ticker-badge" style={{ color: project.accent }}>
          {project.index}
        </span>
        <h2 className="ticker-title">{project.title}</h2>
        <p className="ticker-desc">{project.desc}</p>
        <div className="ticker-tags">
          {project.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
    </>
  )
  const style = { '--card-phase': `${phase}` } as CSSProperties
  return (
    <div
      className={`ticker-card${advancing ? ' is-advancing' : ''}`}
      style={style}
      aria-hidden={interactive ? undefined : true}
    >
      {interactive && project.href ? (
        <a href={project.href} target="_blank" rel="noopener noreferrer">
          {body}
        </a>
      ) : (
        body
      )}
    </div>
  )
}

function Copy({ interactive, basePhase, active, advancing }: {
  interactive: boolean
  basePhase: number
  active: boolean
  advancing: boolean
}) {
  return (
    <>
      {PROJECTS.map((p, i) => (
        <ProjectCard
          key={`${p.index}-${basePhase}`}
          project={p}
          active={active}
          phase={basePhase + i}
          interactive={interactive}
          advancing={advancing}
        />
      ))}
    </>
  )
}

function useVisibility(): [RefObject<HTMLElement>, boolean] {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, visible]
}

export default function ProjectTicker() {
  const trackRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [stageRef, inView] = useVisibility()

  const hoverRef = useRef(false)
  const focusRef = useRef(false)
  const touchRef = useRef(false)
  const navRef = useRef(0)
  const [touching, setTouching] = useState(false)

  const reduced = useRef(prefersReducedMotion()).current

  // advance one project: positive = next (leftward), negative = previous
  const navigate = (dir: 1 | -1) => {
    const track = trackRef.current
    if (!track) return
    const first = track.querySelector<HTMLElement>('.ticker-card')
    const step = first ? first.offsetWidth + 28 : 508
      navRef.current += dir * step
      hoverRef.current = false
      focusRef.current = false
    }

  useEffect(() => {
    const track = trackRef.current
    if (!track || reduced) return

    let raf = 0
    let last = performance.now()
    let x = 0
    let half = track.scrollWidth / 2
    const measure = () => {
      half = track.scrollWidth / 2
    }
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(track)

    const AUTO = SPEED_PX_S
    const NAV = NAV_PX_S

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(Math.max((now - last) / 1000, 0), 1 / 30)
      last = now

      const nav = navRef.current
      if (Math.abs(nav) > 0.5) {
        const dir = nav > 0 ? 1 : -1
        const move = dir * Math.min(Math.abs(nav), NAV * dt)
        x += move
        navRef.current = Math.abs(nav - move) < 0.5 ? 0 : nav - move
      } else if (!(hoverRef.current || focusRef.current || touchRef.current)) {
        x += AUTO * dt
      }

      if (half > 0) x = ((x % half) + half) % half
      track.style.transform = `translateX(${-x}px)`
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [reduced])

  // Drop focus after a card link returns to the tab, so the ticker
  // (paused by :focus-within) resumes instead of staying frozen.
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
    <section className="projects-section" aria-label="Selected work" ref={stageRef}>
      <div className="ticker-stage">
        {!reduced && (
          <>
            <button
              type="button"
              className="ticker-arrow ticker-arrow--left"
              aria-label="Previous project"
              onMouseEnter={() => (hoverRef.current = true)}
              onMouseLeave={() => (hoverRef.current = false)}
              onFocus={() => (focusRef.current = true)}
              onBlur={() => (focusRef.current = false)}
              onClick={() => {
                focusRef.current = false
                hoverRef.current = false
                window.setTimeout(() => (hoverRef.current = false), 0)
                navigate(-1)
              }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              className="ticker-arrow ticker-arrow--right"
              aria-label="Next project"
              onMouseEnter={() => (hoverRef.current = true)}
              onMouseLeave={() => (hoverRef.current = false)}
              onFocus={() => (focusRef.current = true)}
              onBlur={() => (focusRef.current = false)}
              onClick={() => {
                focusRef.current = false
                hoverRef.current = false
                window.setTimeout(() => (hoverRef.current = false), 0)
                navigate(1)
              }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}
        <div
          ref={viewportRef}
          className={`ticker-viewport${touching ? ' is-touching' : ''}`}
          onMouseEnter={() => (hoverRef.current = true)}
          onMouseLeave={() => {
            hoverRef.current = false
          }}
          onFocus={() => (focusRef.current = true)}
          onBlur={() => (focusRef.current = false)}
          onTouchStart={() => {
            touchRef.current = true
            setTouching(true)
          }}
          onTouchEnd={() => {
            touchRef.current = false
            setTouching(false)
          }}
          onTouchCancel={() => {
            touchRef.current = false
            setTouching(false)
          }}
        >
          <div ref={trackRef} className="ticker-track">
            <Copy interactive={inView} basePhase={0} active={inView} advancing={navRef.current !== 0} />
            <span className="ticker-copy-dup" aria-hidden="true" style={{ display: 'contents' }}>
              <Copy interactive={false} basePhase={PROJECTS.length} active={inView} advancing={navRef.current !== 0} />
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
