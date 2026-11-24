export type CursorGuest<T> = { fish: T; x: number; y: number }
export type CursorCarry<T> = {
  idle: number; interested: T | null; carrier: T | null
  approaching: number; carrying: number
}
export function createCursorCarry<T>(): CursorCarry<T> {
  return { idle: 0, interested: null, carrier: null, approaching: 0, carrying: 0 }
}
export function releaseCursor<T>(state: CursorCarry<T>) {
  Object.assign(state, createCursorCarry<T>())
}

export type PondPointer = {
  x: number; y: number; active: boolean; virtual: boolean
  physicalX?: number; physicalY?: number
}
// Keep an on-page cursor after release: restoring the OS arrow would return it
// to its unchanged physical location. Use CSS pixel deltas, converted by scene.ts.
export function movePondPointer(
  pointer: PondPointer, x: number, y: number, width: number, height: number,
  carriedFrom?: { x: number; y: number },
) {
  const dx = pointer.physicalX === undefined ? 0 : x - pointer.physicalX
  const dy = pointer.physicalY === undefined ? 0 : y - pointer.physicalY
  if (carriedFrom) {
    pointer.x = carriedFrom.x; pointer.y = carriedFrom.y; pointer.virtual = true
  }
  if (pointer.virtual) {
    pointer.x = Math.max(0, Math.min(width - 1, pointer.x + dx))
    pointer.y = Math.max(0, Math.min(height - 1, pointer.y + dy))
  } else {
    pointer.x = x; pointer.y = y
  }
  pointer.physicalX = x; pointer.physicalY = y; pointer.active = true
}

export function advanceCursor<T>(
  state: CursorCarry<T>, dt: number, pointer: { x: number; y: number; active: boolean },
  guests: CursorGuest<T>[], dpr: number, random = Math.random,
) {
  if (!pointer.active) { releaseCursor(state); return }
  state.idle += dt
  if (state.carrier !== null) {
    if (!guests.some(guest => guest.fish === state.carrier)) releaseCursor(state)
    else state.carrying += dt
    return
  }
  if (state.interested !== null) {
    const guest = guests.find(guest => guest.fish === state.interested)
    state.approaching += dt
    if (!guest || state.approaching > 14) { releaseCursor(state); return }
    if (Math.hypot(guest.x - pointer.x, guest.y - pointer.y) < 16 * dpr) {
      state.carrier = guest.fish; state.interested = null; state.carrying = 0
    }
    return
  }
  if (state.idle < 2.8 || random() >= 1 - Math.exp(-dt * 0.35)) return
  const nearby = guests.filter(guest => Math.hypot(guest.x - pointer.x, guest.y - pointer.y) < 220 * dpr)
  if (!nearby.length) return
  state.interested = nearby[Math.min(nearby.length - 1, Math.floor(random() * nearby.length))].fish
  state.approaching = 0
}
