import { useEffect, useRef } from 'react'
import { startKoi } from '../lib/koi/scene'
import { loadPondAssets } from '../lib/koi/assets'
import { koiIntro, showLoadError } from '../lib/koi/intro'
import { loadAtlas } from '../lib/koi/sunlight'
import './koi.css'

export default function KoiPage() {
  const water = useRef<HTMLCanvasElement>(null)
  const foreground = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    let stop: (() => void) | undefined
    void loadAtlas()
    void loadPondAssets().then(assets => {
      if (cancelled || !water.current || !foreground.current) return
      stop = startKoi(water.current, foreground.current, assets, koiIntro)
    }).catch(error => { if (!cancelled) showLoadError(error) })
    return () => {
      cancelled = true
      stop?.()
      if (location.pathname !== '/') koiIntro?.stop()
    }
  }, [])

  return (
    <main className="koi-pond" aria-label="An animated pixel koi garden with an empty wooden pier. Click or tap the water to feed the koi. Drag your finger through the water to make wakes.">
      <canvas ref={water} aria-hidden="true" />
      <canvas ref={foreground} className="koi-foreground" aria-hidden="true" />
      <div className="koi-vignette" aria-hidden="true" />
    </main>
  )
}
