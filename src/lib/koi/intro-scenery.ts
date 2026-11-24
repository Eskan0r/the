import './intro-scenery.css'

// A ribbon bends at two joints. The narrow stripe follows the fold as its
// upper blade moves independently of the stipe rooted between the rocks.
function blade(x: number, y: number, scale: number, facing: number, delay: number) {
  return `<g transform="translate(${x} ${y}) scale(${scale * facing} ${scale})" style="--sway-delay:${delay}s">
    <g class="koi-kelp-stipe">
      <path fill="#477d64" d="M-3 1V-8H-1V-13H2V-18H4V-23H8V-17H7V-12H4V-6H2V1Z"/>
      <path fill="#6e9971" d="M0-7V-13H2V-17H5V-21H7V-16H5V-12H3V-7Z"/>
      <g transform="translate(6 -20)"><g class="koi-kelp-blade">
        <path fill="#548c69" d="M-2 2V-6H-5V-13H-8V-21H-9V-27H-6V-34H-3V-38H-1V-31H-3V-25H-2V-19H1V-13H3V-6H2V2Z"/>
        <path fill="#87ab78" d="M0-5V-13H-3V-19H-5V-26H-4V-31H-3V-25H-3V-20H-1V-14H2V-6Z"/>
      </g></g>
    </g></g>`
}

const coral = `<g fill="none" stroke-linecap="square" stroke-linejoin="miter">
  <path stroke="#8d766d" stroke-width="5" d="M1 3V-8H-2V-17H-5V-25M-2-11H-10V-16H-15V-23M0-5H7V-13H12V-21M-4-18H1V-25H4V-29M6-10H16V-15H19V-19"/>
  <path stroke="#c19681" stroke-width="3" d="M0-4V-9H-3V-16H-6V-24M-4-13H-10V-18H-14V-22M6-11V-15H11V-20M-2-20H0V-25H3V-28M12-12H16V-16H18"/>
  <path stroke="#debaa0" stroke-width="2" d="M-15-23V-25M-6-25V-27M3-28V-30M11-21V-23M18-17V-19"/>
</g>`

function habitat(right: boolean) {
  const ribbons = right
    ? blade(30, 76, 0.76, -1, -1.6) + blade(48, 77, 1.12, 1, -3.4) + blade(62, 79, 0.9, -1, -2.1)
    : blade(16, 78, 0.91, -1, -3.9) + blade(29, 78, 1.19, 1, -0.4) + blade(41, 77, 0.72, -1, -2.5)
  return `<svg class="koi-habitat ${right ? 'right' : 'left'}" viewBox="0 0 84 78" shape-rendering="crispEdges">
    <g class="koi-coral" transform="${right ? 'translate(14 78) scale(-.76 .76)' : 'translate(61 78) scale(.92)'}">${coral}</g>
    <g class="koi-grasses">${ribbons}</g>
  </svg>`
}

function minnow(index: number) {
  return `<svg class="koi-minnow minnow-${index}" viewBox="0 0 23 10" shape-rendering="crispEdges">
    <g transform="${index === 3 ? 'translate(23 0) scale(-1 1)' : ''}">
      <path class="koi-minnow-tail" fill="#578e88" d="M2 1H4V2H5V3H7V6H5V7H4V8H2V6H3V4H2Z"/>
      <path fill="#6a9990" d="M6 4H9V3H12V1H14V2H17V3H19V4H21V6H19V7H16V8H13V7H10V6H7Z"/>
      <path fill="#99b6a1" d="M10 4H13V3H16V4H17V5H10Z"/>
      <path fill="#517f7c" d="M18 4H19V5H18ZM12 6H15V7H14V8H12Z"/>
    </g></svg>`
}

export function mountIntroScenery(host: HTMLElement) {
  const layer = document.createElement('div')
  layer.className = 'koi-intro-scenery'
  layer.setAttribute('aria-hidden', 'true')
  layer.innerHTML = habitat(false) + habitat(true) + [1, 2, 3].map(minnow).join('') +
    '<div class="koi-bubbles"><i></i><i></i><i></i><i></i><i></i><i></i></div>'
  host.insertBefore(layer, host.querySelector('canvas'))
}
