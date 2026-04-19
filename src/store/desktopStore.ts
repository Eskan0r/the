import { create } from 'zustand'

interface DesktopStore {
  cursorBlackHole: boolean
  bhStrength: number
  setCursorBlackHole: (v: boolean) => void
  setBhStrength: (v: number) => void
}

export const useDesktopStore = create<DesktopStore>((set) => ({
  cursorBlackHole: false,
  bhStrength: 1,
  setCursorBlackHole: (v) => set({ cursorBlackHole: v }),
  setBhStrength: (v) => set({ bhStrength: v }),
}))