import { create } from 'zustand'

interface DesktopStore {
  cursorBlackHole: boolean
  bhStrength: number
  bhSize: number
  setCursorBlackHole: (v: boolean) => void
  setBhStrength: (v: number) => void
  setBhSize: (v: number) => void
}

export const useDesktopStore = create<DesktopStore>((set) => ({
  cursorBlackHole: false,
  bhStrength: 1,
  bhSize: 1,
  setCursorBlackHole: (v) => set({ cursorBlackHole: v }),
  setBhStrength: (v) => set({ bhStrength: v }),
  setBhSize: (v) => set({ bhSize: v }),
}))