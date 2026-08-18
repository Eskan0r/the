import { useEffect, useRef } from 'react'
import { LiquidGlass } from '@ybouane/liquidglass'
import AnimatedBubbles from './AnimatedBubbles'

export default function HeroSection() {
  const rootRef = useRef<HTMLDivElement>(null)
  const glassRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!rootRef.current || !glassRef.current) return

    glassRef.current.dataset.config = JSON.stringify({
      blurAmount: 0,
      refraction: 1,
      chromAberration: .3,
      edgeHighlight: 0,
      specular: 0.3,
      fresnel: 0.8,
      distortion: 1,
      cornerRadius: 32,
      zRadius: 28,
      opacity: 1,
      saturation: 1,
      tintStrength: 1,
      brightness: 0.04,
      shadowOpacity: 0.12,
      shadowSpread: 10,
      shadowOffsetY: 2,
    })

    let instance: Awaited<ReturnType<typeof LiquidGlass.init>> | null = null

    LiquidGlass.init({
      root: rootRef.current,
      glassElements: [glassRef.current],
    }).then((inst) => {
      instance = inst
    })

    return () => {
      instance?.destroy()
    }
  }, [])

  useEffect(() => {
    const landingPage = document.querySelector('.landing-page')
    if (!landingPage) return

    const onScroll = () => {
      const h = landingPage.clientHeight
      const progress = Math.min(landingPage.scrollTop / (h * 0.8), 1)
      const heroOpacity = Math.max(1 - progress * 2, 0)

      const glassPanel = document.querySelector('.hero-glass-panel') as HTMLElement
      if (glassPanel) glassPanel.style.opacity = String(heroOpacity)
    }

    landingPage.addEventListener('scroll', onScroll, { passive: true })
    return () => landingPage.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section className="hero-section">
      <div className="liquid-glass-root" ref={rootRef}>
        <AnimatedBubbles />
        <div className="hero-glass-panel lg-glass" ref={glassRef}>
          <h1 className="hero-name">Ronak Chavva</h1>
          <p className="hero-tagline">makin things that look like they work</p>
          <div className="hero-ctas">
            <a
              href="https://www.linkedin.com/in/ronakchavva-48b318262"
              target="_blank"
              rel="noopener noreferrer"
              className="cta-primary"
            >
              <LinkedInIcon /> LinkedIn
            </a>
            <a
              href="https://github.com/Eskan0r"
              target="_blank"
              rel="noopener noreferrer"
              className="cta-secondary"
            >
              <GitHubIcon />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}
