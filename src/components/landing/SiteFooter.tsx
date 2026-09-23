const LINKS = [
  { label: 'GitHub', href: 'https://github.com/Eskan0r' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ronak-chavva-48b318262' },
  { label: 'Email', href: 'mailto:ronakch8@gmail.com' },
  { label: 'RonakOS', href: 'https://os.ronakchavva.com' },
]

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="site-footer-line">you reached the end {'<'}3</p>
      <nav className="site-footer-links" aria-label="Contact and profiles">
        {LINKS.map((l) =>
          l.href.startsWith('mailto:') ? (
            <a key={l.label} href={l.href}>
              {l.label}
            </a>
          ) : (
            <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer">
              {l.label}
            </a>
          ),
        )}
      </nav>
      <p className="site-footer-fine">© {new Date().getFullYear()} Ronak Chavva</p>
    </footer>
  )
}
