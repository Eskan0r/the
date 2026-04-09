import React, { useRef, useEffect, useCallback } from 'react'
import { useWindowStore } from '../../store/windowStore'

interface WindowProps {
  id: string
  title: string
  children: React.ReactNode
  isFocused: boolean
  isMinimized: boolean
  isMaximized: boolean
  isClosing: boolean
  position: { x: number; y: number }
  size: { width: number; height: number }
  zIndex: number
}

const TASKBAR_HEIGHT = 32
const MIN_WIDTH = 400
const MIN_HEIGHT = 300

export default function Window({
  id,
  title,
  children,
  isFocused,
  isMinimized,
  isMaximized,
  isClosing,
  position,
  size,
  zIndex,
}: WindowProps) {
  const { closeWindow, focusWindow, minimizeWindow, maximizeWindow, updatePosition, updateSize } =
    useWindowStore()

  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const resizeState = useRef<{
    startX: number; startY: number; origW: number; origH: number
  } | null>(null)
  const windowRef = useRef<HTMLDivElement>(null)

  const onTitleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isMaximized) return
      e.preventDefault()
      focusWindow(id)
      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: position.x,
        origY: position.y,
      }
    },
    [id, isMaximized, position, focusWindow]
  )

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragState.current) return
      const dx = e.clientX - dragState.current.startX
      const dy = e.clientY - dragState.current.startY
      let nx = dragState.current.origX + dx
      let ny = dragState.current.origY + dy

      nx = Math.max(0, Math.min(nx, window.innerWidth - size.width))
      ny = Math.max(0, Math.min(ny, window.innerHeight - TASKBAR_HEIGHT - 28))
      updatePosition(id, nx, ny)
    }
    const onMouseUp = () => { dragState.current = null }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [id, size, updatePosition])

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      resizeState.current = {
        startX: e.clientX,
        startY: e.clientY,
        origW: size.width,
        origH: size.height,
      }
    },
    [size]
  )

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizeState.current) return
      const dx = e.clientX - resizeState.current.startX
      const dy = e.clientY - resizeState.current.startY
      const nw = Math.max(MIN_WIDTH, resizeState.current.origW + dx)
      const nh = Math.max(MIN_HEIGHT, resizeState.current.origH + dy)

      const maxW = window.innerWidth - position.x
      const maxH = window.innerHeight - position.y - TASKBAR_HEIGHT
      updateSize(id, Math.min(nw, maxW), Math.min(nh, maxH))
    }
    const onMouseUp = () => { resizeState.current = null }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [id, position, updateSize])

  if (isMinimized) return null

  const animClass = isClosing ? 'window-closing' : 'window-opening'

  return (
    <div
      ref={windowRef}
      className={animClass}
      onMouseDown={() => focusWindow(id)}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-window)',
        border: `1px solid ${isFocused ? 'var(--border-focus)' : 'var(--border)'}`,
        borderRadius: 4,
        boxShadow: isFocused
          ? '0 8px 40px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5)'
          : '0 4px 20px rgba(0,0,0,0.5)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        overflow: 'hidden',
        willChange: 'transform',
      }}
    >
      <div
        onMouseDown={onTitleMouseDown}
        onDoubleClick={() => maximizeWindow(id)}
        style={{
          height: 28,
          minHeight: 28,
          background: 'var(--bg-titlebar)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 10,
          paddingRight: 10,
          cursor: isMaximized ? 'default' : 'grab',
          userSelect: 'none',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', zIndex: 1 }}>
          <div
            className="window-dot"
            style={{ background: '#ff5555' }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => closeWindow(id)}
            title="Close"
          />
          <div
            className="window-dot"
            style={{ background: '#ffaa00' }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => minimizeWindow(id)}
            title="Minimize"
          />
          <div
            className="window-dot"
            style={{ background: '#44ff88' }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => maximizeWindow(id)}
            title={isMaximized ? 'Restore' : 'Maximize'}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 11,
            color: isFocused ? 'var(--text-secondary)' : '#555',
            letterSpacing: '0.04em',
            pointerEvents: 'none',
            transition: 'color 0.15s',
          }}
        >
          {title}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          opacity: isFocused ? 1 : 0.85,
          transition: 'opacity 0.15s',
        }}
      >
        {children}
      </div>

      {!isMaximized && (
        <div className="resize-handle" onMouseDown={onResizeMouseDown} />
      )}
    </div>
  )
}
