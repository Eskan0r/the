import { useEffect, useState } from 'react'
import './styles/globals.css'
import Desktop from './components/desktop/Desktop'
import Taskbar from './components/desktop/Taskbar'
import WindowManager from './components/window/WindowManager'
import GravityControls from './components/desktop/GravityControls'
import BootScreen from './components/desktop/BootScreen'
import { useAuthStore } from './store/authStore'
import { useDesktopStore } from './store/desktopStore'

const SESSION_KEY = 'ronakos_booted'

export default function App() {
  const { init } = useAuthStore()
  const cursorBlackHole = useDesktopStore((s) => s.cursorBlackHole)
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 })
  const [booted, setBooted] = useState(() => !!sessionStorage.getItem(SESSION_KEY))

  useEffect(() => { init() }, [])

  useEffect(() => {
    document.body.style.cursor = cursorBlackHole ? 'none' : ''
  }, [cursorBlackHole])

  useEffect(() => {
    if (!cursorBlackHole) return
    const handler = (e: MouseEvent) => setCursorPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [cursorBlackHole])

  const handleBooted = () => {
    sessionStorage.setItem(SESSION_KEY, '1')
    setBooted(true)
  }

  return (
    <>
      {!booted && <BootScreen onDone={handleBooted} />}
      <Desktop />
      <WindowManager />
      <Taskbar />
      <GravityControls />
      {cursorBlackHole && (
        <div style={{
          position: 'fixed',
          left: cursorPos.x,
          top: cursorPos.y,
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: 'var(--accent)',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 99999,
          boxShadow: '0 0 4px var(--accent)',
        }} />
      )}
    </>
  )
}