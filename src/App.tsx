import { useEffect } from 'react'
import './styles/globals.css'
import Desktop from './components/desktop/Desktop'
import Taskbar from './components/desktop/Taskbar'
import WindowManager from './components/window/WindowManager'
import { useAuthStore } from './store/authStore'

export default function App() {
  const { init } = useAuthStore()

  useEffect(() => { init() }, [])

  return (
    <>
      <Desktop />
      <WindowManager />
      <Taskbar />
    </>
  )
}