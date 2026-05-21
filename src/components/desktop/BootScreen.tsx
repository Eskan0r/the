// BootScreen.tsx
import { useEffect, useRef, useState } from 'react'

interface Props { onDone: () => void }

export default function BootScreen({ onDone }: Props) {
  const [ready, setReady] = useState(false)
  const didProceed = useRef(false)

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 300)

    return () => clearTimeout(timer)
  }, [])

  const proceed = () => {
    if (!ready || didProceed.current) return
    didProceed.current = true
    onDone()
  }

  useEffect(() => {
    const handler = () => proceed()

    window.addEventListener('keydown', handler)
    window.addEventListener('click', handler)
    window.addEventListener('touchstart', handler)

    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('click', handler)
      window.removeEventListener('touchstart', handler)
    }
  }, [ready])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'black',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Courier New', monospace",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: ready
            ? 'rgba(255,255,255,0.75)'
            : 'rgba(140,255,255,0)',
          transition: 'color 0.6s ease',
          animation: ready
            ? 'bootPulse 2.2s ease-in-out infinite'
            : undefined,
        }}
      >
        — press any key to continue —
      </div>

      <style>{`
        @keyframes bootPulse {
          0%,100% { opacity: 0.75; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}