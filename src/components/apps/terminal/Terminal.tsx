import { useEffect, useRef } from 'react'
import { useTerminal } from './useTerminal'

interface Props {
  windowId: string
}

export default function Terminal({ windowId: _windowId }: Props) {
  const { output, input, setInput, cwd, handleKeyDown } = useTerminal()
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [output])

  const handleContainerClick = () => {
    inputRef.current?.focus()
  }

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const promptLabel = `[user@portfolio ${cwd}]$`

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--bg-terminal)',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'text',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
        lineHeight: '1.6',
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 12px 4px 12px',
        }}
      >
        {output.map((entry) => (
          <div key={entry.id}>
            {entry.isStartup ? (
              <div>
                {entry.lines.map((line, i) => (
                  <div
                    key={i}
                    className="startup-line"
                    style={{ color: lineColor(line.type) }}
                  >
                    {line.text || '\u00A0'}
                  </div>
                ))}
              </div>
            ) : (
              <>
                {entry.prompt && (
                  <div style={{ marginTop: 2 }}>
                    <PromptLine text={entry.prompt} cwd={cwd} />
                  </div>
                )}
                {entry.lines.map((line, i) => (
                  <OutputLineView key={i} line={line} />
                ))}
              </>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: '4px 12px 12px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 0,
        }}
      >
        <span
          style={{
            color: 'var(--accent)',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            flexShrink: 0,
          }}
        >
          {promptLabel}&nbsp;
        </span>
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'transparent',
              caretColor: 'transparent',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 'inherit',
              width: '100%',
              zIndex: 2,
            }}
          />
          <div
            style={{
              color: 'var(--text-primary)',
              whiteSpace: 'pre',
              pointerEvents: 'none',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span>{input}</span>
            <span className="terminal-cursor" />
          </div>
        </div>
      </div>
    </div>
  )
}

function PromptLine({ text, cwd: _cwd }: { text: string; cwd: string }) {
  const dollarIdx = text.indexOf('$ ')
  if (dollarIdx === -1) {
    return <div style={{ color: 'var(--accent)' }}>{text}</div>
  }
  const promptPart = text.slice(0, dollarIdx + 2)
  const cmdPart = text.slice(dollarIdx + 2)
  return (
    <div>
      <span style={{ color: 'var(--accent)' }}>{promptPart}</span>
      <span style={{ color: 'var(--text-primary)' }}>{cmdPart}</span>
    </div>
  )
}

function OutputLineView({ line }: { line: { text: string; type?: string } }) {
  if (line.type === 'raw') {
    return (
      <div
        style={{ color: 'var(--text-terminal)', whiteSpace: 'pre' }}
        dangerouslySetInnerHTML={{ __html: line.text || '\u00A0' }}
      />
    )
  }
  const color = lineColor(line.type)
  return (
    <div style={{ color, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {line.text || '\u00A0'}
    </div>
  )
}

function lineColor(type?: string): string {
  switch (type) {
    case 'accent': return 'var(--accent)'
    case 'secondary': return 'var(--text-secondary)'
    case 'error': return 'var(--text-error)'
    case 'warn': return 'var(--text-warn)'
    default: return 'var(--text-terminal)'
  }
}
