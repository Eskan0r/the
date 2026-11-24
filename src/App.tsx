import { lazy, Suspense, useEffect, useLayoutEffect, type ReactElement } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './styles/base.css'
import { enterFishRoute, isFishRoute } from './lib/koi/route'
import { showLoadError } from './lib/load-error'

function failedPage(error: unknown) {
  function FailedPage(): ReactElement | null {
    useEffect(() => {
      showLoadError(error)
      return () => {
        const message = document.getElementById('load-error')
        if (message) message.hidden = true
      }
    }, [])
    return null
  }
  return { default: FailedPage }
}

const KoiPage = lazy(() => import('./pages/KoiPage').catch(failedPage))
const LandingPage = lazy(() => import('./pages/LandingPage').catch(failedPage))
const OsDesktop = lazy(() => import('./components/OsDesktop').catch(failedPage))

function useIsOsSubdomain() {
  const { hostname } = window.location
  return hostname === 'os.ronakchavva.com' || hostname.startsWith('os.')
}

function FishRoute() {
  const active = isFishRoute(location)
  useLayoutEffect(() => {
    if (!active) return
    void enterFishRoute().catch(showLoadError)
    return () => {
      if (!isFishRoute(location)) {
        document.getElementById('koi-intro')?.dispatchEvent(new Event('koi-dismiss'))
        const message = document.getElementById('load-error')
        if (message) message.hidden = true
      }
    }
  }, [active])
  return active ? <Suspense fallback={null}><KoiPage /></Suspense> : <Navigate to="/" replace />
}

function OsRedirect() {
  useEffect(() => { window.location.replace('https://os.ronakchavva.com') }, [])
  return null
}

export default function App() {
  const isOsSubdomain = useIsOsSubdomain()

  if (isOsSubdomain) {
    return (
      <Suspense fallback={null}>
        <OsDesktop />
      </Suspense>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Suspense fallback={null}><LandingPage /></Suspense>} />
      <Route path="/fish" caseSensitive element={<FishRoute />} />
      <Route path="/archive/original" element={<Navigate to="/" replace />} />
      <Route path="/os" element={<OsRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
