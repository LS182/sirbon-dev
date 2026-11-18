import { ArrowUpRight, Github, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'

const projects = [
  {
    name: 'Sirbon.dev',
    description: 'A self-hosted developer portfolio with public content and a protected administration boundary.',
    tech: ['React', 'TypeScript', 'Cloudflare'],
  },
]

function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="site-shell">
      <header className="nav">
        <Link className="brand" to="/" aria-label="Sirbon.dev home">
          <span className="brand-mark">S</span>
          <span>sirbon.dev</span>
        </Link>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={open ? 'nav-links open' : 'nav-links'}>
          <NavLink to="/" onClick={() => setOpen(false)}>Home</NavLink>
          <NavLink to="/work" onClick={() => setOpen(false)}>Work</NavLink>
          <NavLink to="/about" onClick={() => setOpen(false)}>About</NavLink>
          <a href="/admin" className="nav-admin">Admin</a>
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <span>© {new Date().getFullYear()} Sirbon.dev</span>
        <a href="https://github.com/LS182" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={14} /></a>
      </footer>
    </div>
  )
}

function Home() {
  return (
    <div className="page">
      <section className="hero">
        <p className="eyebrow">SOFTWARE ENGINEER · BUILDER</p>
        <h1>Useful systems,<br /><em>carefully built.</em></h1>
        <p className="hero-copy">I design and ship dependable web products, with a focus on thoughtful interfaces and maintainable engineering.</p>
        <div className="actions">
          <Link className="button primary" to="/work">Explore work <ArrowUpRight size={16} /></Link>
          <Link className="button" to="/about">About me</Link>
        </div>
      </section>
      <section className="section">
        <div className="section-heading"><p>01 / Selected work</p><Link to="/work">View all <ArrowUpRight size={15} /></Link></div>
        <div className="project-card">
          <div className="project-orbit" aria-hidden="true"><span /><span /><span /></div>
          <div className="project-info">
            <p className="project-kind">PORTFOLIO PLATFORM</p>
            <h2>{projects[0].name}</h2>
            <p>{projects[0].description}</p>
            <div className="tags">{projects[0].tech.map((item) => <span key={item}>{item}</span>)}</div>
          </div>
        </div>
      </section>
    </div>
  )
}

function Work() {
  return (
    <section className="page inner-page">
      <p className="eyebrow">SELECTED PROJECTS</p>
      <h1>Work</h1>
      <div className="work-grid">
        {projects.map((project) => (
          <article className="work-card" key={project.name}>
            <Github size={26} />
            <h2>{project.name}</h2>
            <p>{project.description}</p>
            <div className="tags">{project.tech.map((item) => <span key={item}>{item}</span>)}</div>
          </article>
        ))}
      </div>
    </section>
  )
}

function About() {
  return (
    <section className="page inner-page about">
      <p className="eyebrow">ABOUT</p>
      <h1>Builder, engineer,<br /><em>and lifelong learner.</em></h1>
      <p>I’m building this space to share selected software work, technical notes, and the process behind dependable products.</p>
    </section>
  )
}

function Admin() {
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<'checking' | 'ready' | 'unconfigured' | 'error'>('checking')

  useEffect(() => {
    fetch('/api/admin/status')
      .then((response) => response.json())
      .then((data: { configured: boolean }) => setStatus(data.configured ? 'ready' : 'unconfigured'))
      .catch(() => setStatus('error'))
  }, [])

  async function connect(event: React.FormEvent) {
    event.preventDefault()
    const response = await fetch('/api/admin/status', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data: { authenticated: boolean } = await response.json()
    setStatus(data.authenticated ? 'ready' : 'error')
  }

  return (
    <section className="page inner-page admin-page">
      <p className="eyebrow">ADMINISTRATION</p>
      <h1>Content console</h1>
      {status === 'unconfigured' ? (
        <p className="admin-note">Admin access is not configured for this deployment.</p>
      ) : (
        <form className="admin-form" onSubmit={connect}>
          <label htmlFor="token">Admin access token</label>
          <input id="token" type="password" value={token} onChange={(event) => setToken(event.target.value)} />
          <button className="button primary" type="submit">Connect</button>
        </form>
      )}
    </section>
  )
}

function NotFound() {
  return <section className="page inner-page"><p className="eyebrow">404</p><h1>Page not found.</h1><Link className="button" to="/">Return home</Link></section>
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/work" element={<Work />} />
        <Route path="/about" element={<About />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Shell>
  )
}
