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

export type ProjectDemoKind = 'bsg' | 'ronakos' | 'poster'

export interface Project {
  id: string
  index: string
  title: string
  desc: string
  tags: string[]
  href: string
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
]
