export function isFishRoute({ pathname, hostname }: Pick<Location, 'pathname' | 'hostname'>) {
  return (pathname === '/fish' || pathname === '/fish/') && !hostname.startsWith('os.')
}

// Mount the critical HTML while the intro and scene chunks load independently.
export async function enterFishRoute() {
  if (!isFishRoute(location)) return
  document.dispatchEvent(new Event('koi-enter'))
  const host = document.getElementById('koi-intro')
  try {
    const { startKoiIntro } = await import('./intro')
    if (host?.isConnected && isFishRoute(location)) startKoiIntro()
  } catch (error) {
    if (host?.isConnected && isFishRoute(location)) throw error
  }
}
