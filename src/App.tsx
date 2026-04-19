import { useEffect, useState } from 'react'
import './styles/globals.css'
import Desktop from './components/desktop/Desktop'
import Taskbar from './components/desktop/Taskbar'
import WindowManager from './components/window/WindowManager'
import GravityControls from './components/desktop/GravityControls'
import { useAuthStore } from './store/authStore'
import { useDesktopStore } from './store/desktopStore'

export default function App() {
  const { init } = useAuthStore()
  const cursorBlackHole = useDesktopStore((s) => s.cursorBlackHole)
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 })

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

  return (
    <>
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