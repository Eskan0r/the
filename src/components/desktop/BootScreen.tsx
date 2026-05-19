// BootScreen.tsx
import BHPiece1 from './BHPiece1'

interface Props { onDone: () => void }

export default function BootScreen({ onDone }: Props) {
  return (
    <div
      onClick={onDone}
      onKeyDown={onDone}
      tabIndex={0}
      autoFocus
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        cursor: 'default', outline: 'none',
      }}
    >
      {/* black hole render sits behind everything */}
      <BHPiece1 />

      {/* your UI text on top */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13, color: 'rgba(255,255,255,0.4)',
      }}>
        press any key to continue
      </div>
    </div>
  )
}