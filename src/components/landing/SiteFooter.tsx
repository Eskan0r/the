import { useEffect, useRef, useState } from 'react'

/* ─────────────────────────────────────────────────────────────
   SiteFooter — the bottom of the toybox. One funny line, the
   links that matter, nothing else. Email copies to clipboard.
   ───────────────────────────────────────────────────────────── */

const EMAIL = 'ronakch8@gmail.com'

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function EmailCopy() {
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
    timer.current = window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <button type="button" className="site-footer-copy" onClick={copy} aria-label="Copy email address to clipboard">
      <span>Email</span>
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span className="site-footer-copied" aria-live="polite">
        {copied ? 'copied!' : ''}
      </span>
    </button>
  )
}

const LINKS = [
  { label: 'GitHub', href: 'https://github.com/Eskan0r' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ronak-chavva-48b318262' },
  { label: 'RonakOS', href: 'https://os.ronakchavva.com' },
]

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="site-footer-line">you reached the end {'<'}3</p>
      <nav className="site-footer-links" aria-label="Contact and profiles">
        {LINKS.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer">
            {l.label}
          </a>
        ))}
        <EmailCopy />
      </nav>
      <p className="site-footer-fine">© {new Date().getFullYear()} Ronak Chavva</p>
    </footer>
  )
}
