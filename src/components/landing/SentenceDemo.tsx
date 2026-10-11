import { useEffect, useRef, useState, type SyntheticEvent } from 'react'
import { prefersReducedMotion } from '../../lib/motion/gsap'

// Sentence Builder demo: a real miniature Markov generator, the same idea as
// the JavaFX app's Generate tab (start word in, sentences out). The output
// streams in word by word, like a token stream coming off the model.

const SEEDS = [
  'the server restarts at midnight.',
  'the cache expires after an hour.',
  'the robot follows the painted track.',
  'the rain drums on the office roof.',
  'the dog guards the front porch.',
  'the code compiles on the first try.',
  'the test suite finishes in seconds.',
  'the coffee brews while the build runs.',
  'the garden wakes up in april.',
  'the train leaves before dawn.',
  'the backup finishes before lunch.',
  'the monitor glows in the dark room.',
  'the queue drains by morning.',
  'the alert fires when latency spikes.',
  'the deploy rolls out region by region.',
  'the database answers in milliseconds.',
  'the headlights sweep the empty track.',
  'the crowd cheers as the car crosses.',
  'the logs fill up overnight.',
  'the cron job checks every minute.',
]

function buildBigrams(): Map<string, string[]> {
  const map = new Map<string, string[]>()
  SEEDS.forEach((s) => {
    const words = s.toLowerCase().split(/\s+/)
    for (let i = 0; i < words.length - 1; i += 1) {
      const list = map.get(words[i]) ?? []
      list.push(words[i + 1])
      map.set(words[i], list)
    }
  })
  return map
}

const BIGRAMS = buildBigrams()
const STARTERS = Array.from(BIGRAMS.keys())

function generate(start?: string): string {
  const clean = (start ?? '').trim().toLowerCase()
  let word =
    clean && BIGRAMS.has(clean)
      ? clean
      : STARTERS[Math.floor(Math.random() * STARTERS.length)]
  const out = [word]
  for (let i = 0; i < 14; i += 1) {
    const opts = BIGRAMS.get(word)
    if (!opts || opts.length === 0) break
    word = opts[Math.floor(Math.random() * opts.length)]
    out.push(word)
    if (/[.!?]$/.test(word)) break
  }
  out[0] = out[0].charAt(0).toUpperCase() + out[0].slice(1)
  return out.join(' ')
}

const WORD_MS = 120
const HOLD_MS = 1800

export default function SentenceDemo({ active = true }: { active?: boolean }) {
  const reduced = prefersReducedMotion()
  const [input, setInput] = useState('')
  const [target, setTarget] = useState<string[]>(() => generate('the').split(' '))
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? Number.POSITIVE_INFINITY : 0))

  useEffect(() => {
    if (reduced || !active) {
      setShown(Number.POSITIVE_INFINITY)
      return
    }
    setShown(0)
    let count = 0
    let step: number
    let hold: number
    const tick = () => {
      count += 1
      setShown(count)
      if (count < target.length) {
        step = window.setTimeout(tick, WORD_MS)
      } else {
        hold = window.setTimeout(() => {
          setTarget(generate().split(' '))
        }, HOLD_MS)
      }
    }
    const first = window.setTimeout(tick, WORD_MS)
    return () => {
      window.clearTimeout(first)
      window.clearTimeout(step)
      window.clearTimeout(hold)
    }
  }, [target, active, reduced])

  const swallow = (e: SyntheticEvent) => {
    // The demo lives inside the card link; keep its controls usable.
    e.preventDefault()
    e.stopPropagation()
  }

  const streaming = shown < target.length
  const words = target.slice(0, Math.min(shown, target.length))

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className="demo-sentence" aria-hidden="true" onClickCapture={swallow}>
      <div className="demo-sentence-title">Generate sentences</div>
      <div className="demo-sentence-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="start word, e.g. robot"
          tabIndex={-1}
        />
        <button type="button" tabIndex={-1} onClick={() => setTarget(generate(input).split(' '))}>
          Generate
        </button>
      </div>
      <div className="demo-sentence-out">
        &ldquo;{target.slice(0, shown).join(' ')}
        {shown < target.length && <span className="demo-sentence-caret" />}
        &rdquo;
      </div>
      <div className="demo-sentence-hint">markov chain, order 1, {SEEDS.length} seed lines</div>
    </div>
  )
}
