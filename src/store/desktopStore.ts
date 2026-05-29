import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface IconPosition {
  x: number
  y: number
}

interface DesktopStore {
  cursorBlackHole: boolean
  bhStrength: number
  bhSize: number
  singleCenteredBH: boolean
  iconPositions: Record<string, IconPosition>
  setCursorBlackHole: (v: boolean) => void
  setBhStrength: (v: number) => void
  setBhSize: (v: number) => void
  setSingleCenteredBH: (v: boolean) => void
  setIconPosition: (id: string, pos: IconPosition) => void
}

export const useDesktopStore = create<DesktopStore>()(
  persist(
    (set) => ({
      cursorBlackHole: false,
      bhStrength: 1,
      bhSize: 1,
      singleCenteredBH: false,
      iconPositions: {},
      setCursorBlackHole: (v) => set({ cursorBlackHole: v }),
      setBhStrength: (v) => set({ bhStrength: v }),
      setBhSize: (v) => set({ bhSize: v }),
      setSingleCenteredBH: (v) => set({ singleCenteredBH: v }),
      setIconPosition: (id, pos) =>
        set((s) => ({ iconPositions: { ...s.iconPositions, [id]: pos } })),
    }),
    {
      name: 'desktop-icon-positions',
      // Only persist icon positions — black hole settings stay ephemeral
      partialize: (s) => ({ iconPositions: s.iconPositions }),
    }
  )
)