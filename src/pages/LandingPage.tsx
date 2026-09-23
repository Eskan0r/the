import HeroSection from '../components/landing/HeroSection'
import ProjectTicker from '../components/landing/ProjectTicker'
import SiteFooter from '../components/landing/SiteFooter'

export default function LandingPage() {
  return (
    <div className="landing-page">
      <HeroSection />
      <ProjectTicker />
      <SiteFooter />
    </div>
  )
}
