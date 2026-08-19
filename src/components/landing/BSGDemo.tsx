import { useEffect, useRef } from 'react'

const BSG = {
  bg: '#262626',
  surface: '#333333',
  surfaceMid: '#373737',
  border: '#454545',
  separator: '#505050',
  glass: 'rgba(255,255,255,0.1)',
  primary: '#72ab1c',
  accent: '#62AF2E',
  foreground: '#ffffff',
  mutedFg: '#6b7280',
}

const LC = {
  bg: '#1a1a1a',
  surface: '#242424',
  surfaceAlt: '#2a2a2a',
  border: '#383838',
  text: '#e8e8e8',
  textDim: '#a0a0a0',
  green: '#22c55e',
  orange: '#ffa116',
  blue: '#3b82f6',
  codeBg: '#1e1e1e',
  tagBg: '#383838',
}

const CHAT_MESSAGES = [
  { name: 'Riyan', color: '#3b82f6', text: 'ready to grind?', own: false },
  { name: 'Yash', color: '#f59e0b', text: 'yeah lets do two-sum', own: false },
  { name: 'Ronak', color: BSG.primary, text: 'bet, i see a hash map approach', own: true },
  { name: 'Riyan', color: '#3b82f6', text: 'nice, check my solution', own: false },
  { name: 'Yash', color: '#f59e0b', text: 'that looks clean ngl', own: false },
  { name: 'Ronak', color: BSG.primary, text: 'can we do three-sum next?', own: true },
  { name: 'Riyan', color: '#3b82f6', text: 'yeah sure, ill pull up the problem', own: false },
  { name: 'Yash', color: '#f59e0b', text: 'wait im still on two-sum lol', own: false },
  { name: 'Ronak', color: BSG.primary, text: 'no rush take your time', own: true },
  { name: 'Riyan', color: '#3b82f6', text: 'yo this room feature is sick', own: false },
  { name: 'Yash', color: '#f59e0b', text: 'fr we should use this more', own: false },
  { name: 'Ronak', color: BSG.primary, text: 'down, lets do a dp problem next', own: true },
  { name: 'Riyan', color: '#3b82f6', text: 'bet coin change?', own: false },
  { name: 'Yash', color: '#f59e0b', text: 'im down for that', own: false },
]

const CODE_LINES = [
  { tokens: [
    { text: 'function', color: '#c586c0' },
    { text: ' twoSum', color: '#dcdcaa' },
    { text: '(nums, target) {', color: '#d4d4d4' },
  ]},
  { tokens: [
    { text: '  ', color: '#d4d4d4' },
    { text: 'const', color: '#569cd6' },
    { text: ' map = ', color: '#d4d4d4' },
    { text: 'new', color: '#569cd6' },
    { text: ' Map();', color: '#d4d4d4' },
  ]},
  { tokens: [
    { text: '  ', color: '#d4d4d4' },
    { text: 'for', color: '#c586c0' },
    { text: ' (', color: '#d4d4d4' },
    { text: 'let', color: '#569cd6' },
    { text: ' i = 0; i < nums.length; i++) {', color: '#d4d4d4' },
  ]},
  { tokens: [
    { text: '    ', color: '#d4d4d4' },
    { text: 'const', color: '#569cd6' },
    { text: ' complement = target - nums[i];', color: '#d4d4d4' },
  ]},
  { tokens: [
    { text: '    ', color: '#d4d4d4' },
    { text: 'if', color: '#c586c0' },
    { text: ' (map.', color: '#d4d4d4' },
    { text: 'has', color: '#dcdcaa' },
    { text: '(complement)) {', color: '#d4d4d4' },
  ]},
  { tokens: [
    { text: '      ', color: '#d4d4d4' },
    { text: 'return', color: '#c586c0' },
    { text: ' [map.', color: '#d4d4d4' },
    { text: 'get', color: '#dcdcaa' },
    { text: '(complement), i];', color: '#ce9178' },
  ]},
  { tokens: [{ text: '    }', color: '#d4d4d4' }] },
  { tokens: [
    { text: '    map.', color: '#d4d4d4' },
    { text: 'set', color: '#dcdcaa' },
    { text: '(nums[i], i);', color: '#d4d4d4' },
  ]},
  { tokens: [{ text: '  }', color: '#d4d4d4' }] },
  { tokens: [
    { text: '  ', color: '#d4d4d4' },
    { text: 'return', color: '#c586c0' },
    { text: ' [];', color: '#ce9178' },
  ]},
  { tokens: [{ text: '}', color: '#d4d4d4' }] },
]

function RoomIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.6 }}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="rgb(255,157,20)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="7" r="4" stroke="rgb(255,157,20)" strokeWidth="2"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="rgb(255,157,20)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="rgb(255,157,20)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ opacity: active ? 1 : 0.6 }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="rgb(0,123,255)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function LeaderboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.6 }}>
      <path d="M8 21h8m-4-4v4m-3-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm9 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 9a6 6 0 0 0 12 0" stroke="rgb(255,183,0)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function StatsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.6 }}>
      <path d="M18 20V10M12 20V4M6 20v-6" stroke="rgb(2,177,40)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function BSGLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 81 65" fill="none">
      <path
        d="M29.5 13.5L36.8326 20.5015L29.5 27.5M39.7661 27.5H51.5M41 47V61.5M26 61.5H56M65 13H77.5C77.3785 30.2972 72.1025 34.6283 57.5 37M15.5 13H3C3.12147 30.2972 8.3975 34.6283 23 37M15 3H65.5C65.5 3 65.1434 46.6785 40.5 46.5C15.9364 46.3221 15 3 15 3Z"
        stroke={BSG.accent}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const EXAMPLES = [
  { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' },
  { input: 'nums = [3,2,4], target = 6', output: '[1,2]', explanation: '' },
]

export default function BSGDemo() {
  const chatRef = useRef<HTMLDivElement>(null)
  const msgIdx = useRef(-1)

  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        if (!chatRef.current) return
        msgIdx.current = (msgIdx.current + 1) % CHAT_MESSAGES.length
        const msg = CHAT_MESSAGES[msgIdx.current]

        const wrapper = document.createElement('div')
        wrapper.style.cssText = msg.own
          ? 'display:flex;flex-direction:column;gap:3px;align-items:flex-end;opacity:0;transform:translateY(4px);transition:all .2s ease;'
          : 'display:flex;flex-direction:column;gap:12px;opacity:0;transform:translateY(4px);transition:all .2s ease;'

        if (!msg.own) {
          const nameRow = document.createElement('div')
          nameRow.style.cssText = 'display:flex;align-items:center;gap:8px;'
          const avatar = document.createElement('div')
          avatar.style.cssText = `width:24px;height:24px;border-radius:50%;background:${msg.color};flex-shrink:0;`
          const nameEl = document.createElement('span')
          nameEl.style.cssText = `font-size:12px;font-weight:500;color:${BSG.foreground};font-family:Poppins,sans-serif;`
          nameEl.textContent = msg.name
          nameRow.appendChild(avatar)
          nameRow.appendChild(nameEl)
          wrapper.appendChild(nameRow)
        }

        const bubbleContainer = document.createElement('div')
        bubbleContainer.style.cssText = msg.own
          ? 'display:flex;flex-direction:column;gap:4px;align-items:flex-end;'
          : 'display:flex;flex-direction:column;gap:4px;padding-left:12px;'

        const bubble = document.createElement('div')
        const br = msg.own ? 'border-bottom-right-radius:4px;' : 'border-bottom-left-radius:4px;'
        bubble.style.cssText = `max-width:80%;padding:8px 12px;border-radius:16px;${br}background:${BSG.surface};border:1px solid ${BSG.glass};font-size:12px;color:${BSG.foreground};line-height:1.45;font-family:Poppins,sans-serif;white-space:pre-wrap;word-break:break-word;`
        bubble.textContent = msg.text

        bubbleContainer.appendChild(bubble)
        wrapper.appendChild(bubbleContainer)

        chatRef.current.appendChild(wrapper)
        requestAnimationFrame(() => {
          wrapper.style.opacity = '1'
          wrapper.style.transform = 'translateY(0)'
        })

        while (chatRef.current.children.length > 8) {
          const first = chatRef.current.firstChild
          if (first) chatRef.current.removeChild(first)
        }
      }, 1800)

      return () => clearInterval(interval)
    }, 600)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="demo-bsg" style={{
      width: '100%',
      aspectRatio: '16/10',
      borderRadius: '8px',
      overflow: 'hidden',
      display: 'flex',
      border: `1px solid ${BSG.border}`,
      background: BSG.bg,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      {/* LeetCode Side (left 62%) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Split: Description | Code */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Problem Description Panel */}
          <div style={{
            width: '44%',
            display: 'flex',
            flexDirection: 'column',
            borderRight: `1px solid ${LC.border}`,
            overflow: 'hidden',
          }}>
            {/* Tab bar */}
            <div style={{
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              gap: '2px',
              borderBottom: `1px solid ${LC.border}`,
              background: LC.bg,
              flexShrink: 0,
            }}>
              <div style={{
                padding: '4px 10px',
                fontSize: 10,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                color: LC.text,
                borderBottom: `2px solid ${LC.orange}`,
                cursor: 'pointer',
              }}>Description</div>
              <div style={{
                padding: '4px 10px',
                fontSize: 10,
                fontFamily: 'Inter, sans-serif',
                color: LC.textDim,
                cursor: 'pointer',
              }}>Solutions</div>
              <div style={{
                padding: '4px 10px',
                fontSize: 10,
                fontFamily: 'Inter, sans-serif',
                color: LC.textDim,
                cursor: 'pointer',
              }}>Submissions</div>
            </div>

            {/* Description content */}
            <div style={{
              flex: 1,
              overflow: 'hidden',
              padding: '12px 14px',
              background: LC.bg,
              fontFamily: 'Inter, -apple-system, sans-serif',
              fontSize: 10,
              lineHeight: '16px',
              color: LC.text,
            }}>
              {/* Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: LC.text }}>1.</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: LC.text }}>Two Sum</span>
                <span style={{
                  fontSize: 9,
                  padding: '1px 6px',
                  borderRadius: '3px',
                  background: 'rgba(34,197,94,0.15)',
                  color: LC.green,
                  fontWeight: 600,
                }}>Easy</span>
              </div>

              {/* Description */}
              <p style={{ marginBottom: '10px', color: LC.textDim, lineHeight: '1.5' }}>
                Given an array of integers <code style={{ background: LC.tagBg, padding: '1px 4px', borderRadius: '3px', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#e06c75' }}>nums</code> and an integer <code style={{ background: LC.tagBg, padding: '1px 4px', borderRadius: '3px', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#e06c75' }}>target</code>, return <em>indices of the two numbers such that they add up to <code style={{ background: LC.tagBg, padding: '1px 4px', borderRadius: '3px', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#e06c75' }}>target</code></em>.
              </p>
              <p style={{ marginBottom: '12px', color: LC.textDim, lineHeight: '1.5' }}>
                You may assume that each input would have <strong style={{ color: LC.text }}>exactly one solution</strong>, and you may not use the same element twice.
              </p>
              <p style={{ marginBottom: '14px', color: LC.textDim, lineHeight: '1.5' }}>
                You can return the answer in any order.
              </p>

              {/* Examples */}
              {EXAMPLES.map((ex, i) => (
                <div key={i} style={{
                  background: LC.surfaceAlt,
                  border: `1px solid ${LC.border}`,
                  borderRadius: '6px',
                  padding: '8px 10px',
                  marginBottom: '8px',
                }}>
                  <div style={{ fontWeight: 600, fontSize: 10, marginBottom: '4px', color: LC.text }}>Example {i + 1}:</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, lineHeight: '16px' }}>
                    <div><span style={{ color: LC.textDim }}>Input: </span><span style={{ color: LC.text }}>{ex.input}</span></div>
                    <div><span style={{ color: LC.textDim }}>Output: </span><span style={{ color: LC.text }}>{ex.output}</span></div>
                    {ex.explanation && <div><span style={{ color: LC.textDim }}>Explanation: </span><span style={{ color: LC.textDim }}>{ex.explanation}</span></div>}
                  </div>
                </div>
              ))}

              {/* Constraints */}
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontWeight: 600, fontSize: 10, marginBottom: '4px', color: LC.text }}>Constraints:</div>
                <ul style={{ margin: 0, paddingLeft: '14px', color: LC.textDim, lineHeight: '18px', fontSize: 9 }}>
                  <li><code style={{ fontFamily: 'JetBrains Mono, monospace', color: '#e06c75' }}>2 &lt;= nums.length &lt;= 10<sup>4</sup></code></li>
                  <li><code style={{ fontFamily: 'JetBrains Mono, monospace', color: '#e06c75' }}>-10<sup>9</sup> &lt;= nums[i] &lt;= 10<sup>9</sup></code></li>
                  <li><code style={{ fontFamily: 'JetBrains Mono, monospace', color: '#e06c75' }}>-10<sup>9</sup> &lt;= target &lt;= 10<sup>9</sup></code></li>
                  <li>Only one valid answer exists.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Code Editor Panel */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
          }}>
            {/* Language selector bar */}
            <div style={{
              height: '32px',
              background: LC.surface,
              borderBottom: `1px solid ${LC.border}`,
              display: 'flex',
              alignItems: 'center',
              padding: '0 10px',
              gap: '8px',
              flexShrink: 0,
            }}>
              <span style={{
                fontSize: 10,
                fontFamily: 'Inter, sans-serif',
                color: LC.text,
                padding: '3px 8px',
                background: LC.tagBg,
                borderRadius: '4px',
                fontWeight: 500,
              }}>JavaScript</span>
              <div style={{ flex: 1 }} />
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={LC.textDim} strokeWidth="2" strokeLinecap="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={LC.textDim} strokeWidth="2" strokeLinecap="round">
                <path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6"/>
              </svg>
            </div>

            {/* Code */}
            <div style={{
              flex: 1,
              background: LC.codeBg,
              padding: '6px 0',
              overflow: 'hidden',
              fontFamily: 'JetBrains Mono, Consolas, monospace',
              fontSize: 9,
              lineHeight: '15px',
            }}>
              {CODE_LINES.map((line, i) => (
                <div key={i} style={{ display: 'flex', padding: '0 10px', whiteSpace: 'pre' }}>
                  <span style={{ color: '#505050', width: 18, textAlign: 'right', marginRight: 10, userSelect: 'none', fontSize: 9 }}>{i + 1}</span>
                  <span>
                    {line.tokens.map((t, j) => (
                      <span key={j} style={{ color: t.color }}>{t.text}</span>
                    ))}
                  </span>
                </div>
              ))}
            </div>

            {/* Test case tabs + Run/Submit bar */}
            <div style={{
              borderTop: `1px solid ${LC.border}`,
              background: LC.surface,
              flexShrink: 0,
            }}>
              {/* Test case tabs */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px',
                height: '26px',
                gap: '2px',
                borderBottom: `1px solid ${LC.border}`,
              }}>
                <span style={{ fontSize: 9, color: LC.textDim, fontFamily: 'Inter, sans-serif', marginRight: '6px' }}>Testcase</span>
                <div style={{
                  padding: '2px 8px',
                  fontSize: 9,
                  fontFamily: 'Inter, sans-serif',
                  background: LC.tagBg,
                  color: LC.text,
                  borderRadius: '3px',
                  fontWeight: 500,
                }}>Case 1</div>
                <div style={{
                  padding: '2px 8px',
                  fontSize: 9,
                  fontFamily: 'Inter, sans-serif',
                  color: LC.textDim,
                  borderRadius: '3px',
                  cursor: 'pointer',
                }}>Case 2</div>
                <div style={{
                  padding: '2px 8px',
                  fontSize: 9,
                  fontFamily: 'Inter, sans-serif',
                  color: LC.textDim,
                  borderRadius: '3px',
                  cursor: 'pointer',
                }}>Case 3</div>
              </div>

              {/* Test case input display */}
              <div style={{
                padding: '6px 10px',
                borderBottom: `1px solid ${LC.border}`,
                background: LC.bg,
              }}>
                <div style={{ fontSize: 9, color: LC.textDim, fontFamily: 'Inter, sans-serif', marginBottom: '2px' }}>nums =</div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 9,
                  color: LC.text,
                  background: LC.surfaceAlt,
                  padding: '3px 6px',
                  borderRadius: '3px',
                  border: `1px solid ${LC.border}`,
                }}>[2,7,11,15]</div>
                <div style={{ fontSize: 9, color: LC.textDim, fontFamily: 'Inter, sans-serif', marginTop: '3px', marginBottom: '2px' }}>target =</div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 9,
                  color: LC.text,
                  background: LC.surfaceAlt,
                  padding: '3px 6px',
                  borderRadius: '3px',
                  border: `1px solid ${LC.border}`,
                }}>9</div>
              </div>

              {/* Run / Submit buttons */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '6px 10px',
                gap: '6px',
                background: LC.surface,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: '4px',
                  border: `1px solid ${LC.border}`,
                  fontSize: 10,
                  fontFamily: 'Inter, sans-serif',
                  color: LC.textDim,
                  cursor: 'pointer',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={LC.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" fill={LC.green}/>
                  </svg>
                  Run
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: '4px',
                  border: `1px solid ${LC.blue}`,
                  background: 'rgba(59,130,246,0.1)',
                  fontSize: 10,
                  fontFamily: 'Inter, sans-serif',
                  color: LC.blue,
                  cursor: 'pointer',
                }}>
                  Submit
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BSG Extension Panel (right 38%) */}
      <div style={{
        width: '38%',
        display: 'flex',
        flexDirection: 'column',
        background: BSG.bg,
        borderLeft: `1px solid ${BSG.border}`,
      }}>
        {/* HeaderBar */}
        <div style={{
          height: '36px',
          background: BSG.surface,
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          gap: '4px',
          borderBottom: `1px solid ${BSG.glass}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '6px' }}>
            <BSGLogo size={16} />
            <span style={{ fontSize: 11, color: BSG.foreground, fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}>BSG</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <RoomIcon />
              <span style={{ fontSize: 12, color: BSG.foreground, fontFamily: 'Poppins, sans-serif', opacity: 0.6 }}>Room</span>
            </div>
            <div style={{ width: '1px', height: '12px', background: BSG.separator, margin: '0 4px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: BSG.surfaceMid, borderRadius: '5px', padding: '3px 6px' }}>
              <ChatIcon active={true} />
              <span style={{ fontSize: 12, color: BSG.foreground, fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}>Chat</span>
            </div>
            <div style={{ width: '1px', height: '12px', background: BSG.separator, margin: '0 4px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <LeaderboardIcon />
              <span style={{ fontSize: 12, color: BSG.foreground, fontFamily: 'Poppins, sans-serif', opacity: 0.6 }}>Leaderboard</span>
            </div>
            <div style={{ width: '1px', height: '12px', background: BSG.separator, margin: '0 4px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <StatsIcon />
              <span style={{ fontSize: 12, color: BSG.foreground, fontFamily: 'Poppins, sans-serif', opacity: 0.6 }}>Statistics</span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          borderBottom: `1px solid ${BSG.glass}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={BSG.mutedFg} strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </div>
            <div style={{ width: '24px', height: '24px', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={BSG.mutedFg} strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: 11, color: BSG.mutedFg, fontFamily: 'Poppins, sans-serif', background: BSG.glass, padding: '2px 6px', borderRadius: '5px' }}>15:00</span>
          </div>
        </div>

        {/* Chat messages */}
        <div ref={chatRef} style={{
          flex: 1,
          padding: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          justifyContent: 'flex-end',
        }} />

        {/* Chat input */}
        <div style={{
          position: 'relative',
          padding: '16px',
          background: `linear-gradient(to top, ${BSG.bg}, transparent)`,
        }}>
          <div style={{
            background: BSG.surface,
            borderRadius: '21px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: `1px solid ${BSG.glass}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            <span style={{ fontSize: 12, color: BSG.mutedFg, fontFamily: 'Poppins, sans-serif', flex: 1 }}>Type a message</span>
            <svg width="14" height="14" viewBox="0 0 36 34" fill={BSG.mutedFg} style={{ flexShrink: 0 }}>
              <path d="M8.7048 18.6122L27.5602 18.6156L4.0054 29.8753L8.7048 18.6122ZM27.5557 15.3902L8.70503 15.3916L4.00725 4.12918L27.5557 15.3902ZM0.186475 3.25542L5.92143 17.0021L0.184499 30.7496C-0.181688 31.6237 0.0153813 32.6402 0.681867 33.3147C1.37182 34.0129 2.41855 34.1981 3.30573 33.7753L34.9813 18.6293C35.6056 18.33 35.9952 17.6982 36 16.9999C36.0047 16.3016 35.6058 15.6699 34.9815 15.3706L3.30344 0.224559C2.41633 -0.198145 1.36957 -0.0128098 0.679519 0.685522C0.0129362 1.3601 -0.18428 2.37666 0.181782 3.25067L0.186475 3.25542Z" />
            </svg>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          height: '36px',
          background: BSG.surface,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          borderTop: `1px solid ${BSG.glass}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: 11, color: BSG.foreground, fontFamily: 'JetBrains Mono, monospace' }}>X7K9M2</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={BSG.mutedFg} strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
            </div>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={BSG.mutedFg} strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
