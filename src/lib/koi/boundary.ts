// A faint preference inside the screen; strong correction starts outside it.
// Use actual position so anticipation cannot push fish away from visible edges.
export function pondBoundary(
  x: number, y: number, _heading: number, _speed: number,
  radius: number, width: number, height: number,
) {
  const bandX = Math.min(width * 0.16, Math.max(radius * 0.45, width * 0.04))
  const bandY = Math.min(height * 0.16, Math.max(radius * 0.45, height * 0.04))
  const pressure = (distance: number, band: number) => {
    if (distance >= 0) return 0.12 * Math.max(0, 1 - distance / band) ** 2
    const outside = -distance / band
    return 0.12 + 0.24 * outside + 3 * outside ** 2
  }
  return {
    x: pressure(x, bandX) - pressure(width - x, bandX),
    y: pressure(y, bandY) - pressure(height - y, bandY),
  }
}
