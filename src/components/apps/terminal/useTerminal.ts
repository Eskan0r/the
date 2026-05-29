import { useState, useCallback, useRef, useEffect } from 'react'
import { runCommand, OutputLine, TerminalContext, COMMAND_NAMES, FS_COMPLETIONS } from './commands'

export interface TerminalEntry {
  id: number
  prompt?: string
  lines: OutputLine[]
  isStartup?: boolean
}

const STARTUP_LINES: OutputLine[] = [
  { text: 'RonakOS 1.0.0 LTS', type: 'accent' },
  { text: "Type 'help' to get started.", type: 'secondary' },
  { text: '', type: 'default' },
]

const HISTORY_KEY = 'terminal-cmd-history'
const OUTPUT_KEY  = 'terminal-output'
const MAX_PERSISTED  = 5   // command strings for up-arrow
const MAX_OUTPUT = 50  // entries saved to storage (keeps localStorage small)

let entryCounter = 0

export function useTerminal() {
  const pageLoadTime = useRef(Date.now()).current

  const [cwd, setCwd] = useState<string>('~')

  const [history, setHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
    } catch {
      return []
    }
  })

  const historyRef = useRef(history)
  historyRef.current = history

  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const [input, setInput] = useState<string>('')

  // Rehydrate previous session's output, then show startup banner on top
  const [output, setOutput] = useState<TerminalEntry[]>(() => {
    try {
      const saved: TerminalEntry[] = JSON.parse(localStorage.getItem(OUTPUT_KEY) ?? '[]')
      if (saved.length > 0) {
        // Avoid ID collisions with any ids that came from a previous session
        entryCounter = Math.max(...saved.map((e) => e.id)) + 1
      }
      return [
        { id: entryCounter++, lines: STARTUP_LINES, isStartup: true },
        ...saved,
      ]
    } catch {
      return [{ id: entryCounter++, lines: STARTUP_LINES, isStartup: true }]
    }
  })

  // Mirror output to localStorage whenever it changes (skip startup entries)
  useEffect(() => {
    try {
      const toSave = output
        .filter((e) => !e.isStartup)
        .slice(-MAX_OUTPUT)
      localStorage.setItem(OUTPUT_KEY, JSON.stringify(toSave))
    } catch {}
  }, [output])

  const ctx: TerminalContext = { cwd, setCwd, pageLoadTime }

  const submitCommand = useCallback(
    (raw: string) => {
      const trimmed = raw.trim()
      if (!trimmed) return

      const spaceIdx = trimmed.indexOf(' ')
      const partial = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)
      const args = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1)
      const matches = COMMAND_NAMES.filter((c) => c.startsWith(partial.toLowerCase()))
      const resolved = matches.length === 1 ? matches[0] + (args ? ` ${args}` : '') : trimmed

      const newHistory = [...historyRef.current.filter((x) => x !== resolved), resolved]
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory.slice(-MAX_PERSISTED)))
      } catch {}
      setHistory(newHistory)
      setHistoryIndex(-1)
      setInput('')

      const promptLabel = `[user@portfolio ${cwd}]$ `

      if (resolved.trim() === 'history') {
        const displayed = newHistory.slice(-MAX_PERSISTED)
        const lines: OutputLine[] = displayed.length === 0
          ? [{ text: 'no commands in history', type: 'secondary' }]
          : displayed.map((cmd, i) => ({
              text: `  ${String(i + 1).padStart(3)}  ${cmd}`,
              type: 'default' as const,
            }))
        setOutput((prev) => [...prev, { id: entryCounter++, prompt: promptLabel + resolved, lines }])
        return
      }

      const result = runCommand(resolved, ctx)

      if (result.length === 1 && result[0].text === '__CLEAR__') {
        // Wipe both state and storage
        setOutput([])
        try { localStorage.removeItem(OUTPUT_KEY) } catch {}
        return
      }

      setOutput((prev) => [
        ...prev,
        { id: entryCounter++, prompt: promptLabel + resolved, lines: result },
      ])
    },
    [cwd]
  )

  const handleTab = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      const spaceIdx = input.indexOf(' ')
      const hasArgs = spaceIdx !== -1

      if (!hasArgs) {
        const partial = input.toLowerCase()
        if (!partial) return
        const matches = COMMAND_NAMES.filter((c) => c.startsWith(partial))
        if (matches.length === 0) return
        if (matches.length === 1) {
          setInput(matches[0] + ' ')
        } else {
          const lcp = longestCommonPrefix(matches)
          if (lcp.length > partial.length) {
            setInput(lcp)
          } else {
            setOutput((prev) => [
              ...prev,
              {
                id: entryCounter++,
                lines: [
                  { text: `[user@portfolio ${cwd}]$ ${input}`, type: 'accent' as const },
                  { text: matches.join('    '), type: 'secondary' as const },
                ],
              },
            ])
          }
        }
      } else {
        const cmd = input.slice(0, spaceIdx)
        const argPartial = input.slice(spaceIdx + 1)
        if (!['cat', 'cd', 'ls'].includes(cmd.toLowerCase())) return
        const available = FS_COMPLETIONS[cwd] ?? []
        const matches = available.filter((f) => f.toLowerCase().startsWith(argPartial.toLowerCase()))
        if (matches.length === 0) return
        if (matches.length === 1) {
          setInput(cmd + ' ' + matches[0])
        } else {
          const lcp = longestCommonPrefix(matches)
          if (lcp.length > argPartial.length) {
            setInput(cmd + ' ' + lcp)
          } else {
            setOutput((prev) => [
              ...prev,
              {
                id: entryCounter++,
                lines: [
                  { text: `[user@portfolio ${cwd}]$ ${input}`, type: 'accent' as const },
                  { text: matches.join('    '), type: 'secondary' as const },
                ],
              },
            ])
          }
        }
      }
    },
    [input, cwd]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Tab') { handleTab(e); return }
      if (e.key === 'Enter') { submitCommand(input); return }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHistory((h) => {
          const newIdx = historyIndex === -1 ? h.length - 1 : Math.max(0, historyIndex - 1)
          setHistoryIndex(newIdx)
          setInput(h[newIdx] ?? '')
          return h
        })
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHistory((h) => {
          if (historyIndex === -1) return h
          const newIdx = historyIndex + 1
          if (newIdx >= h.length) { setHistoryIndex(-1); setInput('') }
          else { setHistoryIndex(newIdx); setInput(h[newIdx] ?? '') }
          return h
        })
        return
      }
      if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault()
        setOutput([])
        try { localStorage.removeItem(OUTPUT_KEY) } catch {}
        return
      }
    },
    [input, historyIndex, submitCommand, handleTab]
  )

  return { output, input, setInput, cwd, handleKeyDown, submitCommand }
}

function longestCommonPrefix(strs: string[]): string {
  if (strs.length === 0) return ''
  let prefix = strs[0]
  for (let i = 1; i < strs.length; i++) {
    while (!strs[i].startsWith(prefix)) {
      prefix = prefix.slice(0, -1)
      if (!prefix) return ''
    }
  }
  return prefix
}