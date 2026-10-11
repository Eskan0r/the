import { useEffect, useState } from 'react'
import HeroSection from '../components/landing/HeroSection'
import Manifesto from '../components/landing/Manifesto'
import ProjectTicker from '../components/landing/ProjectTicker'
import Capabilities from '../components/landing/Capabilities'
import ContactSection from '../components/landing/ContactSection'
import SiteFooter from '../components/landing/SiteFooter'
import Loader from '../components/landing/Loader'
import ScrollProgress from '../components/landing/ScrollProgress'
import { useSmoothScroll, getLenis } from '../lib/motion/useSmoothScroll'

const INTRO_KEY = 'rc_intro_seen'

function shouldShowIntro(): boolean {
  try {
    return !sessionStorage.getItem(INTRO_KEY)
  } catch {
    return true
  }
}

export default function LandingPage() {
  useSmoothScroll()
  const [loading, setLoading] = useState(shouldShowIntro)

  useEffect(() => {
    const lenis = getLenis()
    if (!lenis) return
    if (loading) lenis.stop()
    else lenis.start()
  }, [loading])

  const finishIntro = () => {
    try {
      sessionStorage.setItem(INTRO_KEY, '1')
    } catch {
      /* storage unavailable — intro just replays next time */
    }
    setLoading(false)
  }

  return (
    <div className="landing-page">
      <ScrollProgress />
      <HeroSection />
      <Manifesto />
      <ProjectTicker />
      <Capabilities />
      <ContactSection />
      <SiteFooter />
      {loading ? <Loader onDone={finishIntro} /> : null}
    </div>
  )
}
