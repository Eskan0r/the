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
    <main className="koi-pond" aria-label="An animated pixel koi garden pond with river stones, water plants, and lily pads. Click or tap the water to feed the fish.">
      <canvas ref={water} aria-hidden="true" />
      <canvas ref={foreground} className="koi-foreground" aria-hidden="true" />
    </main>
  )
}
