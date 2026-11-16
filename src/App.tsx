import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './styles/base.css'
import KoiPage from './pages/KoiPage'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const OsDesktop = lazy(() => import('./components/OsDesktop'))

function useIsOsSubdomain() {
  const { hostname } = window.location
  return hostname === 'os.ronakchavva.com' || hostname.startsWith('os.')
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
      <Route path="/" element={<KoiPage />} />
      <Route
        path="/archive/original"
        element={<Suspense fallback={null}><LandingPage /></Suspense>}
      />
      <Route
        path="/os"
        element={<Navigate to="https://os.ronakchavva.com" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
