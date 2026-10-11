import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger, prefersReducedMotion } from './gsap'

let lenisInstance: Lenis | null = null

export const getLenis = () => lenisInstance

export function scrollToTarget(target: string | number, offset = 0) {
  if (lenisInstance) {
    lenisInstance.scrollTo(target, { offset, duration: 1.1 })
    return
  }
  if (typeof target === 'number') {
    window.scrollTo({ top: target + offset, behavior: 'smooth' })
    return
  }
  const el = document.querySelector(target)
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY + offset
    window.scrollTo({ top, behavior: 'smooth' })
  }
}

export function useSmoothScroll() {
  useEffect(() => {
    document.documentElement.classList.add('landing-active')

    const finish = () => ScrollTrigger.refresh()

    if (prefersReducedMotion()) {
      const id = window.setTimeout(finish, 200)
      return () => {
        window.clearTimeout(id)
        document.documentElement.classList.remove('landing-active')
      }
    }

    const lenis = new Lenis({
      autoRaf: false,
      lerp: 0.1,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
      smoothWheel: true,
    })
    lenisInstance = lenis

    const onScroll = () => ScrollTrigger.update()
    lenis.on('scroll', onScroll)

    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    const refreshId = window.setTimeout(finish, 150)
    if (document.fonts?.ready) document.fonts.ready.then(finish)

    return () => {
      window.clearTimeout(refreshId)
      lenis.off('scroll', onScroll)
      gsap.ticker.remove(raf)
      gsap.ticker.lagSmoothing(500, 33)
      lenis.destroy()
      lenisInstance = null
      document.documentElement.classList.remove('landing-active')
      ScrollTrigger.refresh()
    }
  }, [])
}
