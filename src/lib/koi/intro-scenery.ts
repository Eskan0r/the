import './intro-scenery.css'

const grasses = `
  <g class="koi-grass-far">
    <path d="M23 93Q15 69 10 64Q5 57 3 44Q13 61 17 63Q26 75 28 93Z"/>
    <path d="M28 93Q27 67 34 44Q39 28 37 13Q44 28 38 48Q32 66 33 93Z"/>
    <path d="M37 93Q41 74 54 63Q60 57 62 49Q64 59 54 69Q44 80 42 93Z"/>
  </g>
  <g class="koi-grass-near">
    <path d="M19 93Q19 74 12 55Q5 37 10 21Q9 36 17 51Q27 72 25 93Z"/>
    <path d="M30 93Q35 74 28 47Q23 29 28 7Q28 26 33 42Q42 69 35 93Z"/>
    <path d="M38 93Q35 72 44 55Q51 41 49 33Q55 43 47 59Q41 75 43 93Z"/>
  </g>`

export function mountIntroScenery(host: HTMLElement, signal: AbortSignal) {
  const layer = document.createElement('div')
  layer.className = 'koi-intro-scenery'
  layer.innerHTML = `
    <svg class="koi-grasses left" viewBox="0 0 64 90">${grasses}</svg>
    <svg class="koi-grasses right" viewBox="0 0 64 90">${grasses}</svg>
    <div class="koi-bubbles"><i></i><i></i><i></i><i></i><i></i><i></i></div>`
  host.prepend(layer)

  const backdrop = new Image()
  backdrop.className = 'koi-intro-backdrop'
  backdrop.alt = ''
  backdrop.decoding = 'async'
  backdrop.fetchPriority = 'low'
  backdrop.src = '/pond/intro/background.png'
  signal.addEventListener('abort', () => backdrop.removeAttribute('src'), { once: true })
  void backdrop.decode().then(() => {
    if (!signal.aborted && !host.hasAttribute('data-ready')) layer.prepend(backdrop)
  }).catch(() => { /* Bubbles and grasses also work over the plain water. */ })
}
