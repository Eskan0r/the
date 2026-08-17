import { Routes, Route, Navigate } from 'react-router-dom'
import './styles/globals.css'
import LandingPage from './pages/LandingPage'
import OsDesktop from './components/OsDesktop'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/os" element={<OsDesktop />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}