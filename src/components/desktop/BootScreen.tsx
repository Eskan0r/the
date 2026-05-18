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
        background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13, color: 'rgba(255,255,255,0.4)',
        cursor: 'default', outline: 'none',
      }}
    >
      press any key to continue
    </div>
  )
}