// An opaque band of water hides the moving clip boundary. Its translucent
// leading and trailing edges pass over the two views at their native sizes.
export function startWaterWash(host: HTMLElement, complete: () => void) {
  const water = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  water.setAttribute('viewBox', '0 0 1200 240')
  water.setAttribute('preserveAspectRatio', 'none')
  water.setAttribute('aria-hidden', 'true')
  water.setAttribute('data-water-wash', '')
  water.style.cssText = 'position:fixed;left:-2%;top:-20%;width:104%;height:40%;z-index:2;pointer-events:none;will-change:transform'
  water.innerHTML = `
    <defs>
      <linearGradient id="koi-wash-depth" x1="0" x2=".08" y1="0" y2="1" gradientUnits="objectBoundingBox">
        <stop stop-color="#a5d9c4" stop-opacity=".68"/>
        <stop offset=".27" stop-color="#87c4b4"/>
        <stop offset=".57" stop-color="#68aca4"/>
        <stop offset=".85" stop-color="#87c9bb"/>
        <stop offset="1" stop-color="#bce6cf" stop-opacity=".84"/>
      </linearGradient>
    </defs>
    <path fill="#a6d9c6" opacity=".38" d="M0 55Q96 79 178 58T380 51Q469 73 542 52T731 35Q830 41 925 64T1103 49Q1152 33 1200 34V175H0Z"/>
    <path fill="#6baea5" opacity=".35" d="M0 118H1200V169Q1138 166 1063 189T891 202Q806 178 739 178T558 199Q470 222 385 198T211 179Q104 175 0 203Z"/>
    <path fill="url(#koi-wash-depth)" d="M0 75Q90 98 183 74T369 65Q470 88 554 65T738 49Q825 49 913 75T1098 63Q1155 45 1200 49V164Q1144 159 1071 180T899 192Q813 166 745 167T554 189Q469 210 379 188T199 169Q110 167 0 191Z"/>
    <g fill="none" stroke-linecap="round">
      <path stroke="#d9f0d6" opacity=".66" stroke-width="2.2" d="M-8 191Q71 173 133 171M173 170Q214 170 247 175M322 183Q394 204 455 201M502 198Q536 194 572 184M665 171Q734 161 786 171M852 181Q917 204 979 198M1048 188Q1108 166 1159 164"/>
      <path stroke="#d3ead1" opacity=".43" stroke-width="1.8" d="M24 80Q92 94 156 82M264 62Q306 57 341 64M443 77Q487 82 528 70M668 50Q716 43 759 50M925 79Q981 91 1031 76M1116 59Q1154 47 1190 50"/>
      <path stroke="#d5efd9" opacity=".26" stroke-width="2" d="M55 142q47-7 81-3m15 1 12 1M413 159q42 6 91-7m14-3 18-6M778 123q38-2 84 12m18 5 14 3M1050 146q39-17 80-19"/>
    </g>`
  host.after(water)
  host.dataset.wash = ''
  host.style.willChange = 'clip-path'
  const timing: KeyframeAnimationOptions = { duration: 920, easing: 'cubic-bezier(.38,.12,.3,.93)', fill: 'both' }
  const clip = host.animate([{ clipPath: 'inset(-20% 0 0 0)' }, { clipPath: 'inset(120% 0 0 0)' }], timing)
  // The band is 40% of the viewport high. Its midline follows the clip exactly.
  const sweep = water.animate([{ transform: 'translateY(-50%)' }, { transform: 'translateY(300%)' }], timing)
  sweep.onfinish = complete
  return () => {
    sweep.onfinish = null
    clip.cancel()
    sweep.cancel()
    water.remove()
    host.style.willChange = ''
  }
}
