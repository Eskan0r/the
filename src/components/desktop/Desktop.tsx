import { useWindowStore } from '../../store/windowStore'
import { useDesktopStore } from '../../store/desktopStore'
import DesktopIcon from './DesktopIcon'
import SpaceBackground from './SpaceBackground'

function TerminalIconSVG() {
  return (
    <svg width="40" height="32" viewBox="0 0 40 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="38" height="30" rx="3" stroke="#3d3d3d" strokeWidth="1.5" fill="#111111"/>
      <rect x="1" y="1" width="38" height="8" rx="3" fill="#1a1a1a"/>
      <rect x="1" y="5" width="38" height="4" fill="#1a1a1a"/>
      <circle cx="7" cy="5" r="1.5" fill="#ff5555"/>
      <circle cx="12" cy="5" r="1.5" fill="#ffaa00"/>
      <circle cx="17" cy="5" r="1.5" fill="#44ff88"/>
      <text x="6" y="23" fontFamily="monospace" fontSize="10" fill="#00ff88" fontWeight="bold">&gt;_</text>
    </svg>
  )
}

function StocksIconSVG() {
  return (
    <svg width="40" height="32" viewBox="0 0 40 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="38" height="30" rx="3" stroke="#3d3d3d" strokeWidth="1.5" fill="#111111"/>
      <rect x="1" y="1" width="38" height="8" rx="3" fill="#1a1a1a"/>
      <rect x="1" y="5" width="38" height="4" fill="#1a1a1a"/>
      <circle cx="7" cy="5" r="1.5" fill="#ff5555"/>
      <circle cx="12" cy="5" r="1.5" fill="#ffaa00"/>
      <circle cx="17" cy="5" r="1.5" fill="#44ff88"/>
      <line x1="8"  y1="22" x2="8"  y2="14" stroke="#00ff88" strokeWidth="1"/>
      <rect x="6"  y="16" width="4" height="4" fill="#00ff88"/>
      <line x1="16" y1="24" x2="16" y2="16" stroke="#ff5555" strokeWidth="1"/>
      <rect x="14" y="19" width="4" height="4" fill="#ff5555"/>
      <line x1="24" y1="21" x2="24" y2="13" stroke="#00ff88" strokeWidth="1"/>
      <rect x="22" y="15" width="4" height="4" fill="#00ff88"/>
      <line x1="32" y1="20" x2="32" y2="12" stroke="#00ff88" strokeWidth="1"/>
      <rect x="30" y="13" width="4" height="5" fill="#00ff88"/>
    </svg>
  )
}

const TASKBAR_HEIGHT = 32
const ICON_W = 80
const ICON_H = 60

const DESKTOP_APPS = [
  {
    id: 'terminal-main', label: 'terminal', appType: 'terminal',
    title: 'Terminal', width: 720, height: 480,
    defaultPos: { x: 20, y: 20 },
    icon: <TerminalIconSVG />,
  },
  {
    id: 'stocks-main', label: 'stocks', appType: 'stocks',
    title: 'market.exe', width: 900, height: 600,
    defaultPos: { x: 20, y: 90 },
    icon: <StocksIconSVG />,
  },
]

export default function Desktop() {
  const { openWindow } = useWindowStore()
  const { iconPositions, setIconPosition } = useDesktopStore()

  return (
    <>
      <SpaceBackground />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1 }}>
        {DESKTOP_APPS.map((app) => {
          const pos = iconPositions[app.id] ?? app.defaultPos

          return (
            <div
              key={app.id}
              style={{ position: 'absolute', left: pos.x, top: pos.y }}
            >
              <DesktopIcon
                label={app.label}
                icon={app.icon}
                onDoubleClick={() =>
                  openWindow({
                    id: app.id,
                    title: app.title,
                    appType: app.appType,
                    width: app.width,
                    height: app.height,
                  })
                }
                onPositionChange={(dx, dy) =>
                  setIconPosition(app.id, {
                    x: Math.max(0, Math.min(pos.x + dx, window.innerWidth - ICON_W)),
                    y: Math.max(0, Math.min(pos.y + dy, window.innerHeight - TASKBAR_HEIGHT - ICON_H)),
                  })
                }
              />
            </div>
          )
        })}
      </div>
    </>
  )
}