import ScrambleText from './ScrambleText'

interface SkillGroup {
  index: string
  title: string
  description: string
  items: string[]
}

const GROUPS: SkillGroup[] = [
  {
    index: '01',
    title: 'Languages',
    description: 'Python and Java for backends. TypeScript for interfaces.',
    items: ['Python', 'Java', 'TypeScript', 'JavaScript', 'C / C++', 'Go', 'SQL', 'Bash'],
  },
  {
    index: '02',
    title: 'AI / ML',
    description: 'Retrieval, model serving, and agentic workflows.',
    items: ['LLM serving & RAG', 'PyTorch', 'Reinforcement learning', 'SageMaker', 'Agentic workflows', 'Prompt engineering'],
  },
  {
    index: '03',
    title: 'Backend & Systems',
    description: 'APIs, background workers, and microservices.',
    items: ['Spring Boot', 'Node.js / Express', 'WebSockets', 'Microservices', 'Background workers', 'Linux'],
  },
  {
    index: '04',
    title: 'Frontend & Viz',
    description: 'React and Angular apps, plus Canvas and WebGL visuals.',
    items: ['React', 'Angular', 'Tailwind', 'Canvas 2D', 'WebGL / GLSL', 'UI / UX'],
  },
  {
    index: '05',
    title: 'Data',
    description: 'Relational and NoSQL stores, caching, and hosted Postgres.',
    items: ['PostgreSQL / Aurora', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Supabase'],
  },
  {
    index: '06',
    title: 'Cloud & DevOps',
    description: 'Docker, Kubernetes, Terraform, and CI/CD pipelines.',
    items: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'ArgoCD', 'CI / CD'],
  },
  {
    index: '07',
    title: 'Testing & Reliability',
    description: 'Unit to E2E coverage, plus logs and traces when it breaks.',
    items: ['JUnit', 'PyTest', 'Cypress', 'Vitest', 'Splunk / Dynatrace', 'Root-cause analysis'],
  },
  {
    index: '08',
    title: 'Networking & Security',
    description: 'CCNA-certified networking: TCP/IP, DNS, VPNs, access control.',
    items: ['CCNA', 'TCP/IP & DNS / DoH', 'HTTPS', 'IAM / OAuth', 'Firewalls / VPN', 'NIST / CIS'],
  },
]

const COLUMN_COUNT = 4
// Copies per seamless-loop half; keeps each half taller than the viewport.
const REPEATS_PER_HALF = 3
const DURATIONS = ['40s', '48s', '44s', '52s']
const DIRECTIONS: ('down' | 'up')[] = ['down', 'up', 'down', 'up']

function SkillCard({ group }: { group: SkillGroup }) {
  return (
    <article className="skill-card">
      <span className="skill-card-index">{group.index}</span>
      <h3 className="skill-card-title">{group.title}</h3>
      <p className="skill-card-desc">{group.description}</p>
      <ul className="skill-chips">
        {group.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  )
}

export default function Capabilities() {
  const columns = Array.from({ length: COLUMN_COUNT }, (_, col) =>
    GROUPS.filter((_, i) => i % COLUMN_COUNT === col),
  )

  return (
    <section className="landing-section capabilities" aria-labelledby="capabilities-title">
      <div className="landing-section__inner">
        <ScrambleText
          as="span"
          className="section-label"
          text="02 / Capabilities"
          trigger="inview"
        />
        <h2 id="capabilities-title" className="sr-only">
          Capabilities
        </h2>
        <div className="marquee">
          {columns.map((groups, col) => {
            const half: SkillGroup[] = Array.from(
              { length: REPEATS_PER_HALF },
              () => groups,
            ).flat()
            return (
              <div key={col} className="marquee-col">
                <div
                  className={`marquee-track marquee-track--${DIRECTIONS[col]}`}
                  style={{ animationDuration: DURATIONS[col] }}
                >
                  <div className="marquee-half">
                    {half.map((group, i) => (
                      <div
                        key={`${group.index}-${i}`}
                        className={i >= groups.length ? 'marquee-repeat' : undefined}
                        aria-hidden={i >= groups.length || undefined}
                      >
                        <SkillCard group={group} />
                      </div>
                    ))}
                  </div>
                  <div className="marquee-half marquee-half--b" aria-hidden="true">
                    {half.map((group, i) => (
                      <SkillCard key={`${group.index}-b-${i}`} group={group} />
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
