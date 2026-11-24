import { useEffect, useRef } from 'react'
import { startKoi } from '../lib/koi/scene'
import { loadPondAssets } from '../lib/koi/assets'
import { koiIntro, startKoiIntro } from '../lib/koi/intro'
import { isFishRoute } from '../lib/koi/route'
import { showLoadError } from '../lib/load-error'
import { loadAtlas } from '../lib/koi/sunlight'
import './koi.css'

export default function KoiPage() {
  const water = useRef<HTMLCanvasElement>(null)
  const foreground = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    let stop: (() => void) | undefined
    startKoiIntro()
    const intro = koiIntro
    intro?.markLoaded('app')
    const scenery = loadPondAssets().then(assets => {
      if (!cancelled) intro?.markLoaded('scenery')
      return assets
    })
    const sunlight = loadAtlas().then(atlas => {
      if (!cancelled) intro?.markLoaded('sunlight')
      return atlas
    })
    void Promise.all([scenery, sunlight]).then(([assets, atlas]) => {
      if (cancelled || !water.current || !foreground.current) return
      stop = startKoi(water.current, foreground.current, assets, atlas, intro)
    }).catch(error => { if (!cancelled) showLoadError(error) })
    return () => {
      cancelled = true
      stop?.()
      if (!isFishRoute(location)) koiIntro?.stop()
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
