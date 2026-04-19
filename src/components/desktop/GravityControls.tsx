import { useDesktopStore } from '../../store/desktopStore'

export default function GravityControls() {
  const { cursorBlackHole, bhStrength, setBhStrength } = useDesktopStore()
  if (!cursorBlackHole) return null

  return (
    <div style={{
      position: 'fixed',
      top: 48,
      right: 12,
      width: 220,
      background: 'var(--bg-window)',
      border: '1px solid var(--border)',
      borderRadius: 4,
      padding: '12px 14px',
      zIndex: 9998,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 11,
      boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
    }}>
      <div style={{
        color: 'var(--accent)',
        fontWeight: 600,
        letterSpacing: '0.05em',
        marginBottom: 12,
        fontSize: 11,
      }}>
        gravitational controls
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          color: 'var(--text-secondary)',
          marginBottom: 6,
        }}>
          <span>strength</span>
          <span style={{ color: 'var(--text-primary)' }}>{bhStrength.toFixed(2)}x</span>
        </div>
        <input
          type="range"
          min={0.1}
          max={5}
          step={0.05}
          value={bhStrength}
          onChange={(e) => setBhStrength(parseFloat(e.target.value))}
          style={{
            width: '100%',
            accentColor: 'var(--accent)',
            cursor: 'pointer',
          }}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          color: '#444',
          fontSize: 9,
          marginTop: 3,
        }}>
          <span>0.1x</span>
          <span>5x</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        {[0.5, 1, 2, 4].map((v) => (
          <button
            key={v}
            onClick={() => setBhStrength(v)}
            style={{
              flex: 1,
              height: 22,
              background: bhStrength === v ? 'var(--accent)' : 'transparent',
              border: `1px solid ${bhStrength === v ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 3,
              color: bhStrength === v ? '#000' : 'var(--text-secondary)',
              fontFamily: 'inherit',
              fontSize: 10,
              cursor: 'pointer',
              transition: 'all 0.1s',
            }}
          >
            {v}x
          </button>
        ))}
      </div>

      <div style={{ color: '#333', fontSize: 9, marginTop: 10, lineHeight: 1.5 }}>
        click anywhere to spawn asteroid
      </div>
    </div>
  )
}