import { create } from 'zustand'

interface DesktopStore {
  cursorBlackHole: boolean
  bhStrength: number
  bhSize: number
  singleCenteredBH: boolean
  setCursorBlackHole: (v: boolean) => void
  setBhStrength: (v: number) => void
  setBhSize: (v: number) => void
  setSingleCenteredBH: (v: boolean) => void
}

export const useDesktopStore = create<DesktopStore>((set) => ({
  cursorBlackHole: false,
  bhStrength: 1,
  bhSize: 1,
  singleCenteredBH: false,
  setCursorBlackHole: (v) => set({ cursorBlackHole: v }),
  setBhStrength: (v) => set({ bhStrength: v }),
  setBhSize: (v) => set({ bhSize: v }),
  setSingleCenteredBH: (v) => set({ singleCenteredBH: v }),
}))