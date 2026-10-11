import SplitText from './SplitText'
import ScrambleText from './ScrambleText'

export default function Manifesto() {
  return (
    <section className="landing-section manifesto" aria-labelledby="manifesto-title">
      <div className="landing-section__inner">
        <ScrambleText
          as="span"
          className="section-label"
          text="01 / About"
          trigger="inview"
        />
        <h2 id="manifesto-title" className="manifesto-text">
          <SplitText
            as="span"
            text="I build backends, data layers, and interfaces."
            stagger={0.04}
          />
        </h2>
      </div>
    </section>
  )
}
