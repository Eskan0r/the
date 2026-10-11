// TOH demo: miniature copy of the real Threads of Hope landing hero
// (website-three-kappa-12.vercel.app). Uses the club's own logo assets so
// the mark is exact; the rest of the layout is recreated in CSS to stay
// crisp at card size.

import tohNavLogo from '../../assets/toh-nav-logo.png'
import tohYarnball from '../../assets/toh-yarnball.png'

const SANS =
  "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const YARN = '\u{1F9F6}'

export default function TohDemo() {
  return (
    <div className="demo-toh demo-toh--landing" style={{ fontFamily: SANS }} aria-hidden="true">
      <header className="demo-toh-top">
        <span className="demo-toh-logo">
          <img src={tohNavLogo} alt="Threads of Hope" className="demo-toh-logo-img" />
        </span>
        <nav className="demo-toh-links">
          <span>About</span>
          <span>Projects</span>
          <span>Events</span>
          <span className="demo-toh-join">Join</span>
        </nav>
      </header>
      <div className="demo-toh-hero">
        <div className="demo-toh-copy">
          <h3 className="demo-toh-title">
            Crocheting comfort for
            <br />
            hospitals &amp; homes.
          </h3>
          <p className="demo-toh-sub">
            Student run at UTD, we make and donate various crochet items for
            hospitals, nursing homes, and many more! Join a workshop or donate
            to support our cause!
          </p>
          <div className="demo-toh-ctas">
            <span className="demo-toh-joinbtn">Join a Workshop</span>
            <span className="demo-toh-see">See our Events</span>
          </div>
          <div className="demo-toh-stats">
            <span>{YARN} 500+ items donated</span>
            <span className="demo-toh-dot" />
            <span>Est. 2025</span>
            <span className="demo-toh-dot" />
            <span>Open to all skill levels</span>
          </div>
        </div>
        <div className="demo-toh-yarn">
          <img src={tohYarnball} alt="" className="demo-toh-yarn-img" />
        </div>
      </div>
    </div>
  )
}
