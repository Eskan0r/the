import { useEffect, useState } from 'react'
import { useWindowStore } from '../../store/windowStore'
import { useAuthStore } from '../../store/authStore'

export default function Taskbar() {
  const { windows, focusWindow, restoreWindow, minimizeWindow } = useWindowStore()
  const { user, profile, signOut } = useAuthStore()
  const [time, setTime] = useState(getTime())

  useEffect(() => {
    const id = setInterval(() => setTime(getTime()), 1000)
    return () => clearInterval(id)
  }, [])

  const maxZ = Math.max(...windows.map((w) => w.zIndex), 0)

  function handlePillClick(id: string, isMinimized: boolean, zIndex: number) {
    if (isMinimized) restoreWindow(id)
    else if (zIndex === maxZ) minimizeWindow(id)
    else focusWindow(id)
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 32,
      background: 'var(--bg-titlebar)', borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      paddingLeft: 12, paddingRight: 12, zIndex: 9999, gap: 8,
    }}>
      <div style={{ color: 'var(--accent)', fontSize: 11, letterSpacing: '0.06em', flexShrink: 0, fontWeight: 500 }}>
        ~/ronak
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

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {user && (
          <>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {profile?.username ?? user.email}
              {profile?.is_admin && (
                <span style={{ color: 'var(--accent)', marginLeft: 4 }}>[admin]</span>
              )}
            </span>
            <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
            <span
              onClick={signOut}
              style={{
                fontSize: 11, color: 'var(--text-secondary)',
                cursor: 'pointer', transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-error)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              logout
            </span>
            <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
          </>
        )}
        <div style={{ color: 'var(--text-secondary)', fontSize: 11, letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' }}>
          {time}
        </div>
      </div>
    </div>
  )
}

function getTime(): string {
  const now = new Date()
  return [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
}