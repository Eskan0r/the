import { useEffect, useState } from 'react'
import { useWindowStore } from '../../store/windowStore'

export default function Taskbar() {
  const { windows, focusWindow, restoreWindow, minimizeWindow } = useWindowStore()
  const [time, setTime] = useState(getTime())

  useEffect(() => {
    const id = setInterval(() => setTime(getTime()), 1000)
    return () => clearInterval(id)
  }, [])

  const maxZ = Math.max(...windows.map((w) => w.zIndex), 0)

  function handlePillClick(id: string, isMinimized: boolean, zIndex: number) {
    if (isMinimized) {
      restoreWindow(id)
    } else if (zIndex === maxZ) {
      minimizeWindow(id)
    } else {
      focusWindow(id)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 32,
        background: 'var(--bg-titlebar)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 12,
        paddingRight: 12,
        zIndex: 9999,
        gap: 8,
      }}
    >
      <div
        style={{
          color: 'var(--accent)',
          fontSize: 11,
          letterSpacing: '0.06em',
          flexShrink: 0,
          fontWeight: 500,
        }}
      >
        ~/portfolio
      </div>

      <div style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0 }} />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
        {windows.map((win) => {
          const isActive = win.zIndex === maxZ && !win.isMinimized
          return (
            <div
              key={win.id}
              className={`taskbar-pill${isActive ? ' active' : ''}${win.isMinimized ? ' minimized' : ''}`}
              onClick={() => handlePillClick(win.id, win.isMinimized, win.zIndex)}
            >
              <span className="pill-dot" />
              {win.title}
            </div>
          )
        })}
      </div>

      <div
        style={{
          color: 'var(--text-secondary)',
          fontSize: 11,
          letterSpacing: '0.04em',
          flexShrink: 0,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {time}
      </div>
    </div>
  )
}

function getTime(): string {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}
