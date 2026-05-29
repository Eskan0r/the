import React, { useState, useRef } from 'react'

interface DesktopIconProps {
  label: string
  icon: React.ReactNode
  onDoubleClick: () => void
  onPositionChange: (dx: number, dy: number) => void
}

const DRAG_THRESHOLD = 5

export default function DesktopIcon({
  label,
  icon,
  onDoubleClick,
  onPositionChange,
}: DesktopIconProps) {
  const [selected, setSelected] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clickCount = useRef(0)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const movedRef = useRef(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    startRef.current = { x: e.clientX, y: e.clientY }
    movedRef.current = false

    const onMouseMove = (me: MouseEvent) => {
      if (!startRef.current) return
      const dx = me.clientX - startRef.current.x
      const dy = me.clientY - startRef.current.y

      if (!movedRef.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        movedRef.current = true
        setIsDragging(true)
        if (clickTimer.current) clearTimeout(clickTimer.current)
        clickCount.current = 0
      }

      if (movedRef.current) setOffset({ x: dx, y: dy })
    }

    const onMouseUp = (me: MouseEvent) => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)

      if (movedRef.current && startRef.current) {
        const dx = me.clientX - startRef.current.x
        const dy = me.clientY - startRef.current.y
        // Reset offset BEFORE calling onPositionChange so both
        // the container left/top and the transform hit 0 in the same render
        setOffset({ x: 0, y: 0 })
        setIsDragging(false)
        onPositionChange(dx, dy)
      } else {
        setOffset({ x: 0, y: 0 })
        setIsDragging(false)
      }

      startRef.current = null
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (movedRef.current) return

    clickCount.current += 1
    if (clickCount.current === 1) {
      setSelected(true)
      clickTimer.current = setTimeout(() => { clickCount.current = 0 }, 300)
    } else if (clickCount.current === 2) {
      if (clickTimer.current) clearTimeout(clickTimer.current)
      clickCount.current = 0
      onDoubleClick()
    }
  }

  return (
    <div
      className={`desktop-icon${selected ? ' selected' : ''}`}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onBlur={() => setSelected(false)}
      tabIndex={0}
      style={{
        cursor: isDragging ? 'grabbing' : 'pointer',
        userSelect: 'none',
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        // No transitions at all — avoids the fling-then-snap artifact
        position: 'relative',
        zIndex: isDragging ? 999 : undefined,
      }}
    >
      {icon}
      <span className="desktop-icon-label">{label}</span>
    </div>
  )
}