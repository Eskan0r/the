import { useWindowStore } from '../../store/windowStore'
import Window from './Window'
import Terminal from '../apps/terminal/Terminal'
import StocksApp from '../apps/stocks/StocksApp.tsx'

const APP_COMPONENTS: Record<string, React.ComponentType<{ windowId: string }>> = {
  terminal: Terminal,
  stocks: StocksApp,
}

export default function WindowManager() {
  const { windows } = useWindowStore()
  const maxZ = Math.max(...windows.map((w) => w.zIndex), 0)

  return (
    <>
      {windows.map((win) => {
        const AppComponent = APP_COMPONENTS[win.appType]
        return (
          <Window
            key={win.id}
            id={win.id}
            title={win.title}
            isFocused={win.zIndex === maxZ && !win.isMinimized}
            isMinimized={win.isMinimized}
            isMaximized={win.isMaximized}
            isClosing={win.isClosing}
            position={win.position}
            size={win.size}
            zIndex={win.zIndex}
          >
            {AppComponent ? (
              <AppComponent windowId={win.id} />
            ) : (
              <div style={{ padding: 16, color: 'var(--text-error)' }}>
                Unknown app type: {win.appType}
              </div>
            )}
          </Window>
        )
      })}
    </>
  )
}