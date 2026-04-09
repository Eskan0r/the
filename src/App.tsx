import './styles/globals.css'
import type React from 'react'
import Desktop from './components/desktop/Desktop'
import Taskbar from './components/desktop/Taskbar'
import WindowManager from './components/window/WindowManager'

export default function App() {
  return (
    <>
      <Desktop />

      <WindowManager />

      <Taskbar />
    </>
  )
}
