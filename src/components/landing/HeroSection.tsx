import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { LiquidGlass } from '@ybouane/liquidglass'
import AnimatedBubbles from './AnimatedBubbles'

export default function HeroSection() {
  const rootRef = useRef<HTMLDivElement>(null)
  const glassRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!rootRef.current || !glassRef.current) return

    glassRef.current.dataset.config = JSON.stringify({
      blurAmount: 0.12,
      refraction: 0.85,
      chromAberration: 0.04,
      edgeHighlight: 0.14,
      specular: 0.3,
      fresnel: 0.8,
      distortion: 0.02,
      cornerRadius: 32,
      zRadius: 28,
      opacity: 0.95,
      saturation: 0.15,
      tintStrength: 0.03,
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

  return (
    <section className="hero-section">
      <div className="liquid-glass-root" ref={rootRef}>
        <AnimatedBubbles />
        <div className="hero-name lg-glass" ref={glassRef}>
          Ronak Chavva
        </div>
      </div>

      <motion.div
        className="hero-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="hero-tagline">makin things that look like they work</p>

        <motion.div
          className="hero-ctas"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <a
            href="https://ronakchavva.com"
            target="_blank"
            rel="noopener noreferrer"
            className="cta-primary"
          >
            Explore OS
          </a>
          <a
            href="https://github.com/Eskan0r"
            target="_blank"
            rel="noopener noreferrer"
            className="cta-secondary"
          >
            <GitHubIcon />
          </a>
        </motion.div>
      </motion.div>
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
