import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '../../lib/motion/gsap'

// Slack bot demo: scripted loop of the real workflow — ask the bot about
// outages, get the rundown. Mirrors the internal AI Slack bot project.

interface Msg {
  from: 'ronak' | 'bot'
  text: string
  sub?: string[]
  time: string
}

const SCRIPT: Msg[] = [
  { from: 'ronak', text: '@outage-bot check outage', time: '2:14 PM' },
  {
    from: 'bot',
    text: '2 active outages right now:',
    sub: [
      'api-gateway: 5xx spike in us-east-1 since 14:02',
      'payments-db: failover finished 13:58, watching',
    ],
    time: '2:14 PM',
  },
  { from: 'ronak', text: 'ack, watching gateway', time: '2:15 PM' },
  {
    from: 'bot',
    text: 'Noted. I will ping here if the error rate moves.',
    time: '2:15 PM',
  },
]

const STEP_MS = 1500
const HOLD_MS = 3200

export default function SlackBotDemo({ active = true }: { active?: boolean }) {
  const [count, setCount] = useState(0)
  const [typing, setTyping] = useState(false)
  const reduced = prefersReducedMotion()

  useEffect(() => {
    if (reduced || !active) {
      setCount(SCRIPT.length)
      setTyping(false)
      return
    }
    setCount(0)
    setTyping(false)
    let i = 0
    let timer = 0
    const advance = () => {
      if (i >= SCRIPT.length) {
        timer = window.setTimeout(() => {
          i = 0
          setCount(0)
          timer = window.setTimeout(advance, STEP_MS)
        }, HOLD_MS)
        return
      }
      const next = SCRIPT[i]
      if (next.from === 'bot') {
        setTyping(true)
        timer = window.setTimeout(() => {
          setTyping(false)
          i += 1
          setCount(i)
          timer = window.setTimeout(advance, STEP_MS)
        }, 800)
      } else {
        i += 1
        setCount(i)
        timer = window.setTimeout(advance, STEP_MS)
      }
    }
    timer = window.setTimeout(advance, 600)
    return () => window.clearTimeout(timer)
  }, [active, reduced])

  return (
    <div className="demo-slack" aria-hidden="true">
      <div className="demo-slack-side">
        <div className="demo-slack-ws">SF</div>
        <div className="demo-slack-chs">
          <span># general</span>
          <span># oncall</span>
          <span className="on"># outages</span>
        </div>
      </div>
      <div className="demo-slack-main">
        <div className="demo-slack-head"># outages</div>
        <div className="demo-slack-msgs">
          {SCRIPT.slice(0, count).map((m, i) => (
            <div key={i} className="demo-slack-msg">
              <span className={`demo-slack-avatar${m.from === 'bot' ? ' bot' : ''}`}>
                {m.from === 'bot' ? 'B' : 'R'}
              </span>
              <div>
                <span className="demo-slack-name">
                  {m.from === 'bot' ? 'outage-bot' : 'ronak'}
                </span>
                <span className="demo-slack-time">{m.time}</span>
                <div className="demo-slack-text">{m.text}</div>
                {m.sub && (
                  <div className="demo-slack-sub">
                    {m.sub.map((s) => (
                      <div key={s}>{s}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {typing && <div className="demo-slack-typing">outage-bot is typing…</div>}
        </div>
      </div>
    </div>
  )
}
