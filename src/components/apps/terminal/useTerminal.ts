import { useState, useCallback, useRef } from 'react'
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

let entryCounter = 0

export function useTerminal() {
  const pageLoadTime = useRef(Date.now()).current

  const [cwd, setCwd] = useState<string>('~')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const [input, setInput] = useState<string>('')
  const [output, setOutput] = useState<TerminalEntry[]>([
    { id: entryCounter++, lines: STARTUP_LINES, isStartup: true },
  ])

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

    setHistory((h) => [...h.filter((x) => x !== resolved), resolved])
    setHistoryIndex(-1)
    setInput('')

    const promptLabel = `[user@portfolio ${cwd}]$ `
    const result = runCommand(resolved, ctx)

    if (result.length === 1 && result[0].text === '__CLEAR__') {
      setOutput([])
      return
    }

    if (resolved === trimmed) {
      setOutput((prev) => [...prev, { id: entryCounter++, prompt: promptLabel + resolved, lines: result }])
    } else {
      setOutput((prev) => [...prev, {
        id: entryCounter++,
        prompt: promptLabel + resolved,
        lines: result,
      }])
    }
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
            // argument ambiguity
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
        // completing a file/dir argument
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
            // command name ambiguity
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
      if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); setOutput([]); return }
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