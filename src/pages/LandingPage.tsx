import HeroSection from '../components/landing/HeroSection'
import BSGDemo from '../components/landing/BSGDemo'
import RonakOSDemo from '../components/landing/RonakOSDemo'

export default function LandingPage() {
  return (
    <div className="landing-page">
      <HeroSection />

      <section className="projects-section">
        <div className="project-slide">
          <div className="project-info">
            <span className="project-badge" style={{ color: '#4fc3f7' }}>01</span>
            <h2 className="project-title">Binary Search Gang</h2>
            <p className="project-desc">Chrome extension for collaborative LeetCode</p>
            <div className="project-tags">
              <span>Node.js</span>
              <span>PostgreSQL</span>
              <span>Redis</span>
              <span>Kafka</span>
              <span>WebSockets</span>
            </div>
          </div>
          <a
            href="https://github.com/acmutd/bsg"
            target="_blank"
            rel="noopener noreferrer"
            className="demo-wrapper"
          >
            <BSGDemo />
          </a>
        </div>

        <div className="project-slide">
          <div className="project-info">
            <span className="project-badge" style={{ color: '#00ff88' }}>02</span>
            <h2 className="project-title">RonakOS</h2>
            <p className="project-desc">Desktop portfolio experience</p>
            <div className="project-tags">
              <span>React</span>
              <span>TypeScript</span>
              <span>Zustand</span>
              <span>Supabase</span>
              <span>Canvas</span>
            </div>
          </div>
          <a
            href="https://os.ronakchavva.com"
            target="_blank"
            rel="noopener noreferrer"
            className="demo-wrapper"
          >
            <RonakOSDemo />
          </a>
        </div>

        <div className="next-section">
          <p className="next-section-text">more coming soon</p>
        </div>
      </section>
    </div>
  )
}
