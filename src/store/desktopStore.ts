import { create } from 'zustand'

interface DesktopStore {
  cursorBlackHole: boolean
  setCursorBlackHole: (v: boolean) => void
}

export const useDesktopStore = create<DesktopStore>((set) => ({
  cursorBlackHole: false,
  setCursorBlackHole: (v) => set({ cursorBlackHole: v }),
}))