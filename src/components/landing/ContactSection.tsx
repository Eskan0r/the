import { useEffect, useRef, useState } from 'react'
import Reveal from './Reveal'
import ScrambleText from './ScrambleText'
import MagneticButton from './MagneticButton'

const EMAIL = 'ronakch8@gmail.com'

export default function ContactSection() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = EMAIL
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <section className="landing-section contact" aria-labelledby="contact-title">
      <div className="landing-section__inner">
        <ScrambleText
          as="span"
          className="section-label"
          text="03 — Contact"
          trigger="inview"
        />
        <Reveal>
          <h2 id="contact-title" className="contact-title">
            Let&rsquo;s make something.
          </h2>
        </Reveal>
        <Reveal className="contact-actions" delay={0.1}>
          <MagneticButton className="contact-btn" onClick={copy} ariaLabel={`Copy email address, ${EMAIL}`}>
            {copied ? 'Copied!' : EMAIL}
            <span className="sr-only" aria-live="polite">
              {copied ? 'Email address copied to clipboard' : ''}
            </span>
          </MagneticButton>
          <MagneticButton
            className="contact-btn ghost"
            href="https://github.com/Eskan0r"
            target="_blank"
          >
            GitHub
          </MagneticButton>
          <MagneticButton
            className="contact-btn ghost"
            href="https://www.linkedin.com/in/ronak-chavva-48b318262"
            target="_blank"
          >
            LinkedIn
          </MagneticButton>
        </Reveal>
      </div>
    </section>
  )
}
