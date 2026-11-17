import { useEffect, useRef } from 'react'
import { startKoi } from '../lib/koi/scene'
import './koi.css'

export default function KoiPage() {
  const water = useRef<HTMLCanvasElement>(null)
  const foreground = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!water.current || !foreground.current) return
    return startKoi(water.current, foreground.current)
  }, [])

  return (
    <main className="koi-pond" aria-label="An animated pixel koi garden with an empty wooden pier. Click or tap the water to feed the koi. Drag your finger through the water to make wakes.">
      <canvas ref={water} aria-hidden="true" />
      <canvas ref={foreground} className="koi-foreground" aria-hidden="true" />
      <div className="koi-vignette" aria-hidden="true" />
    </main>
  )
}
