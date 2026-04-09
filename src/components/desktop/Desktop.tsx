import { useWindowStore } from '../../store/windowStore'
import DesktopIcon from './DesktopIcon'

function TerminalIconSVG() {
  return (
    <svg
      width="40"
      height="32"
      viewBox="0 0 40 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="1"
        y="1"
        width="38"
        height="30"
        rx="3"
        stroke="#3d3d3d"
        strokeWidth="1.5"
        fill="#111111"
      />
      <rect x="1" y="1" width="38" height="8" rx="3" fill="#1a1a1a" />
      <rect x="1" y="5" width="38" height="4" fill="#1a1a1a" />

      <circle cx="7" cy="5" r="1.5" fill="#ff5555" />
      <circle cx="12" cy="5" r="1.5" fill="#ffaa00" />
      <circle cx="17" cy="5" r="1.5" fill="#44ff88" />

      <text
        x="6"
        y="23"
        fontFamily="monospace"
        fontSize="10"
        fill="#00ff88"
        fontWeight="bold"
      >
        &gt;_
      </text>
    </svg>
  )
}

/** apps registry.
 *  add a new app icon, add an entry here.
 */
const DESKTOP_APPS = [
  {
    id: 'terminal-main',
    label: 'cmd',
    appType: 'terminal',
    title: 'RonakOS',
    width: 720,
    height: 480,
    icon: <TerminalIconSVG />,
  },
]

export default function Desktop() {
  const { openWindow } = useWindowStore()

  function handleDesktopClick() {
  }

  return (
    <div
      className="desktop-bg"
      onClick={handleDesktopClick}
      style={{ position: 'fixed', inset: 0 }}
    >
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {DESKTOP_APPS.map((app) => (
          <DesktopIcon
            key={app.id}
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
          />
        ))}
      </div>
    </div>
  )
}
