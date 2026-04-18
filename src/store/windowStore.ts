import { create } from 'zustand'

export interface WindowState {
  id: string
  title: string
  appType: string
  isMinimized: boolean
  isMaximized: boolean
  isClosing: boolean
  position: { x: number; y: number }
  size: { width: number; height: number }
  preMaximize?: { x: number; y: number; width: number; height: number }
  zIndex: number
}

interface WindowStore {
  windows: WindowState[]
  topZ: number
  openWindow: (opts: {
    id?: string
    title: string
    appType: string
    width?: number
    height?: number
  }) => string
  closeWindow: (id: string) => void
  removeWindow: (id: string) => void
  focusWindow: (id: string) => void
  minimizeWindow: (id: string) => void
  restoreWindow: (id: string) => void
  maximizeWindow: (id: string) => void
  updatePosition: (id: string, x: number, y: number) => void
  updateSize: (id: string, width: number, height: number) => void
}

const TASKBAR_HEIGHT = 32
const CASCADE_OFFSET = 24

function nextCascadePos(windows: WindowState[], width: number, height: number) {
  const visible = windows.filter((w) => !w.isMinimized && !w.isMaximized)
  const idx = visible.length
  const baseX = 80 + (idx * CASCADE_OFFSET) % 200
  const baseY = 60 + (idx * CASCADE_OFFSET) % 120
  const maxX = window.innerWidth - width - 20
  const maxY = window.innerHeight - height - TASKBAR_HEIGHT - 20
  return {
    x: Math.min(baseX, Math.max(20, maxX)),
    y: Math.min(baseY, Math.max(20, maxY)),
  }
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  topZ: 10,

  openWindow({ id, title, appType, width = 720, height = 480 }) {
    const finalId = id ?? `${appType}-${Date.now()}`

    const existing = get().windows.find((w) => w.id === finalId)
    if (existing) {
      if (existing.isMinimized) {
        get().restoreWindow(finalId)
      } else {
        get().focusWindow(finalId)
      }
      return finalId
    }

    const topZ = get().topZ + 1
    const pos = nextCascadePos(get().windows, width, height)
    set((s) => ({
      topZ,
      windows: [
        ...s.windows,
        {
          id: finalId,
          title,
          appType,
          isMinimized: false,
          isMaximized: false,
          isClosing: false,
          position: pos,
          size: { width, height },
          zIndex: topZ,
        },
      ],
    }))
    return finalId
  },

  closeWindow(id) {
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, isClosing: true } : w)),
    }))
    setTimeout(() => get().removeWindow(id), 85)
  },

  removeWindow(id) {
    set((s) => ({ windows: s.windows.filter((w) => w.id !== id) }))
  },

  focusWindow(id) {
    const topZ = get().topZ + 1
    set((s) => ({
      topZ,
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, zIndex: topZ } : w
      ),
    }))
  },

  minimizeWindow(id) {
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, isMinimized: true } : w)),
    }))
  },

  restoreWindow(id) {
    const topZ = get().topZ + 1
    set((s) => ({
      topZ,
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, isMinimized: false, zIndex: topZ } : w
      ),
    }))
  },

  maximizeWindow(id) {
    set((s) => ({
      windows: s.windows.map((w) => {
        if (w.id !== id) return w
        if (w.isMaximized) {
          const pre = w.preMaximize
          return {
            ...w,
            isMaximized: false,
            position: pre ? { x: pre.x, y: pre.y } : w.position,
            size: pre ? { width: pre.width, height: pre.height } : w.size,
            preMaximize: undefined,
          }
        } else {
          return {
            ...w,
            isMaximized: true,
            preMaximize: { x: w.position.x, y: w.position.y, ...w.size },
            position: { x: 0, y: 0 },
            size: {
              width: window.innerWidth,
              height: window.innerHeight - TASKBAR_HEIGHT,
            },
          }
        }
      }),
    }))
  },

  updatePosition(id, x, y) {
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, position: { x, y } } : w
      ),
    }))
  },

  updateSize(id, width, height) {
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, size: { width, height } } : w
      ),
    }))
  },
}))
