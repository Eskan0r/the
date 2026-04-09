import React, { useState, useRef } from 'react'

interface DesktopIconProps {
  label: string
  icon: React.ReactNode
  onDoubleClick: () => void
}

export default function DesktopIcon({ label, icon, onDoubleClick }: DesktopIconProps) {
  const [selected, setSelected] = useState(false)
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clickCount = useRef(0)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    clickCount.current += 1

    if (clickCount.current === 1) {
      setSelected(true)
      clickTimer.current = setTimeout(() => {
        clickCount.current = 0
      }, 300)
    } else if (clickCount.current === 2) {
      if (clickTimer.current) clearTimeout(clickTimer.current)
      clickCount.current = 0
      onDoubleClick()
    }
  }

  return (
    <div
      className={`desktop-icon${selected ? ' selected' : ''}`}
      onClick={handleClick}
      onBlur={() => setSelected(false)}
      tabIndex={0}
    >
      {icon}
      <span className="desktop-icon-label">{label}</span>
    </div>
  )
}
