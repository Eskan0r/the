import { useEffect, useRef } from 'react'

// Accurate BSG dark theme colors from global.css
const BSG = {
  bg: '#262626',
  surface: '#333333',
  surfaceAlt: '#2e2e2e',
  surfaceMid: '#373737',
  surfaceInput: '#3c3c3c',
  border: '#454545',
  separator: '#505050',
  hover: '#484848',
  glass: 'rgba(255,255,255,0.1)',
  glassStrong: 'rgba(255,255,255,0.22)',
  dark: '#1a1a1a',
  primary: '#72ab1c',
  accent: '#62AF2E',
  foreground: '#ffffff',
  mutedFg: '#6b7280',
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
  'function twoSum(nums, target) {',
  '  const map = new Map();',
  '  for (let i = 0; i < nums.length; i++) {',
  '    const complement = target - nums[i];',
  '    if (map.has(complement)) {',
  '      return [map.get(complement), i];',
  '    }',
  '    map.set(nums[i], i);',
  '  }',
  '  return [];',
  '}',
]

function getLineColor(line: string): string {
  if (line.includes('function') || line.includes('return') || line.includes('for') || line.includes('if')) return '#c586c0'
  if (line.includes('const') || line.includes('let')) return '#569cd6'
  if (line.includes('new Map') || line.includes('.has') || line.includes('.get') || line.includes('.set')) return '#dcdcaa'
  if (line.includes('[') && line.includes(']')) return '#ce9178'
  return '#d4d4d4'
}

// Tab icon SVGs matching the actual extension HeaderBar colors
function RoomIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: active ? 1 : 0.6 }}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="rgb(255,157,20)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="7" r="4" stroke="rgb(255,157,20)" strokeWidth="2"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="rgb(255,157,20)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="rgb(255,157,20)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: active ? 1 : 0.6 }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="rgb(0,123,255)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function LeaderboardIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: active ? 1 : 0.6 }}>
      <path d="M8 21h8m-4-4v4m-3-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm9 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 9a6 6 0 0 0 12 0" stroke="rgb(255,183,0)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function StatsIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: active ? 1 : 0.6 }}>
      <path d="M18 20V10M12 20V4M6 20v-6" stroke="rgb(2,177,40)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// BSG logo SVG (stylized "B" / trophy shape)
function BSGLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 81 65" fill="none" xmlns="http://www.w3.org/2000/svg">
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

export default function BSGDemo() {
  const chatRef = useRef<HTMLDivElement>(null)
  const msgIdx = useRef(-1)

  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        if (!chatRef.current) return
        msgIdx.current = (msgIdx.current + 1) % CHAT_MESSAGES.length
        const msg = CHAT_MESSAGES[msgIdx.current]

        // Build message matching actual ChatDisplay.tsx structure
        const wrapper = document.createElement('div')
        if (msg.own) {
          // Own message: flex-col gap-1 items-end
          wrapper.style.cssText = 'display:flex;flex-direction:column;gap:3px;align-items:flex-end;opacity:0;transform:translateY(4px);transition:all .2s ease;'
        } else {
          // Others: flex-col gap-3
          wrapper.style.cssText = 'display:flex;flex-direction:column;gap:12px;opacity:0;transform:translateY(4px);transition:all .2s ease;'
        }

        if (!msg.own) {
          // Avatar row: flex gap-2 items-center
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

        // Message bubble container (pl-3 gap-1 for others)
        const bubbleContainer = document.createElement('div')
        if (msg.own) {
          bubbleContainer.style.cssText = 'display:flex;flex-direction:column;gap:4px;align-items:flex-end;'
        } else {
          bubbleContainer.style.cssText = 'display:flex;flex-direction:column;gap:4px;padding-left:12px;'
        }

        const bubble = document.createElement('div')
        // Matches actual ChatDisplay bubble classes:
        // Own: max-w-[80%] px-3 py-2 bg-bsg-surface rounded-2xl border border-bsg-glass
        // Others: max-w-[80%] px-3 py-2 bg-bsg-surface rounded-2xl rounded-tl-sm border border-bsg-glass
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

        // Keep max 8 message groups visible
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
    <div style={{
      width: '100%',
      aspectRatio: '16/10',
      borderRadius: '8px',
      overflow: 'hidden',
      display: 'flex',
      border: `1px solid ${BSG.border}`,
      background: BSG.bg,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      {/* LeetCode code editor (left side) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#1e1e1e' }}>
        <div style={{
          height: '32px',
          background: BSG.surface,
          borderBottom: `1px solid ${BSG.border}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: '6px',
        }}>
          <span style={{ fontSize: 11, color: '#888', fontFamily: 'Poppins, sans-serif' }}>Two Sum</span>
          <span style={{ marginLeft: 'auto', fontSize: 9, color: '#22c55e', fontFamily: 'Poppins, sans-serif' }}>Easy</span>
        </div>
        <div style={{
          flex: 1,
          padding: '10px 0',
          overflow: 'hidden',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          lineHeight: '17px',
        }}>
          {CODE_LINES.map((line, i) => (
            <div key={i} style={{ display: 'flex', padding: '0 14px', whiteSpace: 'pre' }}>
              <span style={{ color: BSG.mutedFg, width: 20, textAlign: 'right', marginRight: 14, userSelect: 'none', fontSize: 9 }}>{i + 1}</span>
              <span style={{ color: getLineColor(line) }}>{line}</span>
            </div>
          ))}
        </div>
      </div>

      {/* BSG Extension Panel (right side) */}
      <div style={{
        width: '38%',
        display: 'flex',
        flexDirection: 'column',
        background: BSG.bg,
        borderLeft: `1px solid ${BSG.border}`,
      }}>
        {/* HeaderBar (h-9 = 36px) - matches actual HeaderBar.tsx */}
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

          {/* Tab separators and tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <RoomIcon active={false} />
              <span style={{ fontSize: 12, color: BSG.foreground, fontFamily: 'Poppins, sans-serif', opacity: 0.6 }}>Room</span>
            </div>
            <div style={{ width: '1px', height: '12px', background: BSG.separator, margin: '0 4px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: BSG.surfaceMid, borderRadius: '5px', padding: '3px 6px' }}>
              <ChatIcon active={true} />
              <span style={{ fontSize: 12, color: BSG.foreground, fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}>Chat</span>
            </div>
            <div style={{ width: '1px', height: '12px', background: BSG.separator, margin: '0 4px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <LeaderboardIcon active={false} />
              <span style={{ fontSize: 12, color: BSG.foreground, fontFamily: 'Poppins, sans-serif', opacity: 0.6 }}>Leaderboard</span>
            </div>
            <div style={{ width: '1px', height: '12px', background: BSG.separator, margin: '0 4px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <StatsIcon active={false} />
              <span style={{ fontSize: 12, color: BSG.foreground, fontFamily: 'Poppins, sans-serif', opacity: 0.6 }}>Statistics</span>
            </div>
          </div>
        </div>

        {/* Toolbar (h-8 = 32px) - only shown when in room */}
        <div style={{
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          borderBottom: `1px solid ${BSG.glass}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {/* Prev problem */}
            <div style={{ width: '24px', height: '24px', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={BSG.mutedFg} strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </div>
            {/* Next problem */}
            <div style={{ width: '24px', height: '24px', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={BSG.mutedFg} strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: 11, color: BSG.mutedFg, fontFamily: 'Poppins, sans-serif', background: BSG.glass, padding: '2px 6px', borderRadius: '5px' }}>15:00</span>
          </div>
        </div>

        {/* Chat messages area - matches ChatDisplay.tsx structure exactly */}
        <div ref={chatRef} style={{
          flex: 1,
          padding: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          justifyContent: 'flex-end',
        }} />

        {/* Chat input area - matches actual ChatDisplay.tsx */}
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
            {/* Send button */}
            <svg width="14" height="14" viewBox="0 0 36 34" fill={BSG.mutedFg} style={{ flexShrink: 0 }}>
              <path d="M8.7048 18.6122L27.5602 18.6156L4.0054 29.8753L8.7048 18.6122ZM27.5557 15.3902L8.70503 15.3916L4.00725 4.12918L27.5557 15.3902ZM0.186475 3.25542L5.92143 17.0021L0.184499 30.7496C-0.181688 31.6237 0.0153813 32.6402 0.681867 33.3147C1.37182 34.0129 2.41855 34.1981 3.30573 33.7753L34.9813 18.6293C35.6056 18.33 35.9952 17.6982 36 16.9999C36.0047 16.3016 35.6058 15.6699 34.9815 15.3706L3.30344 0.224559C2.41633 -0.198145 1.36957 -0.0128098 0.679519 0.685522C0.0129362 1.3601 -0.18428 2.37666 0.181782 3.25067L0.186475 3.25542Z" />
            </svg>
          </div>
        </div>

        {/* Footer (h-9 = 36px) - matches actual Footer.tsx */}
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
            {/* Share */}
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={BSG.mutedFg} strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
            </div>
            {/* Feedback */}
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={BSG.mutedFg} strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
