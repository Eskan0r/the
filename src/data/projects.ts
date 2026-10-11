/* ─────────────────────────────────────────────────────────────
   Project data for the ticker ("The Wire").

   Adding a project = appending one object here. No layout,
   loop, or wiring changes needed.

   demo:
   - 'bsg' / 'ronakos' → full live simulation card
   - 'poster'          → stylish static card for projects that
                         don't have a live demo yet (they can
                         graduate to a full demo later)
   ───────────────────────────────────────────────────────────── */

export type ProjectDemoKind =
  | 'bsg'
  | 'ronakos'
  | 'deepracer'
  | 'dns'
  | 'roflow'
  | 'sentence'
  | 'slackbot'
  | 'toh'
  | 'poster'

export interface Project {
  id: string
  index: string
  title: string
  desc: string
  tags: string[]
  // Optional: internal / award work with no public link renders unlinked.
  href?: string
  accent: string
  demo: ProjectDemoKind
}

export const PROJECTS: Project[] = [
  {
    id: 'bsg',
    index: '01',
    title: 'Binary Search Gang',
    desc: 'Chrome extension for collaborative LeetCode',
    tags: ['Node.js', 'PostgreSQL', 'Redis', 'Kafka', 'WebSockets'],
    href: 'https://github.com/acmutd/bsg',
    accent: '#4fc3f7',
    demo: 'bsg',
  },
  {
    id: 'ronakos',
    index: '02',
    title: 'RonakOS',
    desc: 'Desktop portfolio experience',
    tags: ['React', 'TypeScript', 'Zustand', 'Supabase', 'Canvas'],
    href: 'https://os.ronakchavva.com',
    accent: '#00ff88',
    demo: 'ronakos',
  },
  {
    id: 'deepracer',
    index: '03',
    title: 'AWS DeepRacer',
    desc: 'Reinforcement learning racer. 1st place nationally.',
    tags: ['Python', 'PyTorch', 'SageMaker'],
    accent: '#ff9f1c',
    demo: 'deepracer',
  },
  {
    id: 'dns-proxy',
    index: '04',
    title: 'DNS Security Proxy',
    desc: 'DNS proxy that sinkholes malicious domains before they resolve',
    tags: ['Python', 'UDP', 'DoH', 'SQLite'],
    href: 'https://github.com/Eskan0r/DNS_Proxy',
    accent: '#ff6b6b',
    demo: 'dns',
  },
  {
    id: 'roflow',
    index: '05',
    title: 'roflow',
    desc: 'PCG puzzle generator and path-routing demo',
    tags: ['Angular', 'TypeScript', 'Tailwind', 'Cypress'],
    href: 'https://github.com/Eskan0r/flow',
    accent: '#b388ff',
    demo: 'roflow',
  },
  {
    id: 'sentence-builder',
    index: '06',
    title: 'Sentence Builder',
    desc: 'Markov-chain sentence generator, in progress',
    tags: ['Java', 'JavaFX', 'MySQL', 'JUnit'],
    href: 'https://github.com/Eskan0r/SentenceBuilder',
    accent: '#ffca3a',
    demo: 'sentence',
  },
  {
    id: 'slack-bot',
    index: '07',
    title: 'AI Slack Bot',
    desc: 'Slack bot serving an internal AI model API',
    tags: ['Python', 'Node.js', 'PostgreSQL'],
    accent: '#8ecae6',
    demo: 'slackbot',
  },
  {
    id: 'toh-website',
    index: '08',
    title: 'TOH Website',
    desc: 'Site for a UTD student org',
    tags: ['React', 'Vite', 'React Router'],
    href: 'https://website-three-kappa-12.vercel.app/',
    accent: '#64dfdf',
    demo: 'toh',
  },
]
