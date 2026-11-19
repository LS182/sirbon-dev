import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Database,
  Github,
  Layers3,
  LoaderCircle,
  Menu,
  RefreshCw,
  Star,
  X,
} from 'lucide-react'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useParams } from 'react-router-dom'
import { caseStudies, education, experience, profile, skillGroups, type CaseStudy } from './content'

type Project = {
  id: string
  slug: string
  name: string
  summary: string
  description?: string
  repositoryUrl?: string
  demoUrl?: string
  technologies: string[]
  featured: boolean
  published: boolean
  updatedAt?: string
  [key: string]: unknown
}

type Review = {
  id: string
  name: string
  rating: number
  review: string
  project_reference?: string
  created_at: string
}

function dbBoolean(value: unknown) {
  return value === true || value === 1 || value === '1'
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options)
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Request failed' })) as { error?: string }
    throw new Error(body.error || 'Request failed')
  }
  return response.json() as Promise<T>
}

function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="site-shell">
      <header className="nav">
        <Link className="brand" to="/" aria-label="Sirbon.dev home" onClick={() => setOpen(false)}>
          <span className="brand-mark">LS</span>
          <span>sirbon.dev</span>
        </Link>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={open ? 'nav-links open' : 'nav-links'}>
          <NavLink to="/" end onClick={() => setOpen(false)}>Home</NavLink>
          <NavLink to="/about" onClick={() => setOpen(false)}>About</NavLink>
          <NavLink to="/experience" onClick={() => setOpen(false)}>Experience</NavLink>
          <NavLink to="/skills" onClick={() => setOpen(false)}>Skills</NavLink>
          <NavLink to="/projects" onClick={() => setOpen(false)}>Projects</NavLink>
          <NavLink to="/reviews" onClick={() => setOpen(false)}>Reviews</NavLink>
          <Link className="nav-contact" to="/contact" onClick={() => setOpen(false)}>Contact</Link>
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <div><strong>Liam Victor Sirbon</strong><span>Cape Town, South Africa</span></div>
        <a href="https://github.com/LS182" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={14} /></a>
      </footer>
    </div>
  )
}

function Loading() {
  return <div className="loading"><LoaderCircle className="spin" size={20} /> Loading</div>
}

function PortraitPlaceholder() {
  return (
    <div className="portrait-placeholder" role="img" aria-label="Portrait area for Liam Sirbon">
      <div className="portrait-monogram" aria-hidden="true">LS</div>
      <p>Portrait</p>
      <span>Replace with a real photograph of Liam</span>
    </div>
  )
}

function Home() {
  const [publishedProjects, setPublishedProjects] = useState<Project[]>([])
  useEffect(() => {
    api<{ projects: Project[] }>('/api/projects')
      .then((data) => setPublishedProjects(data.projects))
      .catch(() => setPublishedProjects([]))
  }, [])

  const featured = caseStudies.filter((study) => study.featured).concat(
    publishedProjects.filter((project) => project.featured && !caseStudies.some((study) => study.slug === project.slug)).map((project) => ({
      slug: project.slug,
      name: project.name,
      kind: 'Published project' as const,
      summary: project.summary,
      purpose: project.description || project.summary,
      problem: '',
      technologies: project.technologies,
      architecture: [],
      contribution: [],
      challenges: [],
      featured: true,
      repositoryUrl: project.repositoryUrl,
      demoUrl: project.demoUrl,
    })),
  )

  return (
    <div className="page">
      <section className="hero identity-hero">
        <div className="hero-copy-block">
          <p className="eyebrow">SOFTWARE ENGINEERING STUDENT · FULL-STACK DEVELOPER</p>
          <h1>Liam<br /><em>Victor Sirbon</em></h1>
          <p className="hero-copy">{profile.introduction}</p>
          <p className="location-line">Based in Cape Town, Western Cape, South Africa</p>
          <div className="actions">
            <Link className="button primary" to="/projects">View my projects <ArrowRight size={16} /></Link>
            <Link className="button" to="/contact">Contact Liam</Link>
          </div>
        </div>
        <PortraitPlaceholder />
      </section>

      <section className="section">
        <div className="section-heading">
          <p>01 / Selected work</p>
          <Link to="/projects">View all projects <ArrowUpRight size={15} /></Link>
        </div>
        {featured.length === 0 ? (
          <div className="empty-state">No public projects are published yet.</div>
        ) : (
          <div className="featured-projects">
            {featured.slice(0, 3).map((project) => (
              <Link className="featured-project" to={`/projects/${project.slug}`} key={project.slug}>
                <div className="project-marker"><Layers3 size={22} /><span>{project.kind}</span></div>
                <h2>{project.name}</h2>
                <p>{project.summary}</p>
                <div className="tags">{project.technologies.slice(0, 5).map((item) => <span key={item}>{item}</span>)}</div>
                <span className="text-link">Read project <ArrowUpRight size={15} /></span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="section skills-preview">
        <div>
          <p className="eyebrow">02 / Technical range</p>
          <h2>Built across the stack.</h2>
        </div>
        <div className="skill-preview-grid">
          {skillGroups.slice(0, 5).map((group) => (
            <div key={group.title}>
              <h3>{group.title}</h3>
              <p>{group.items.join(' · ')}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section home-contact">
        <p className="eyebrow">Get in touch</p>
        <h2>Looking for a developer for an opportunity or project?</h2>
        <Link className="button primary" to="/contact">Start a conversation <ArrowRight size={16} /></Link>
      </section>
    </div>
  )
}

function Projects() {
  const [publishedProjects, setPublishedProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    api<{ projects: Project[] }>('/api/projects')
      .then((data) => setPublishedProjects(data.projects))
      .catch((issue) => setError(issue instanceof Error ? issue.message : 'Unable to load synchronized projects'))
      .finally(() => setLoading(false))
  }, [])

  const additionalProjects: CaseStudy[] = publishedProjects
    .filter((project) => !caseStudies.some((study) => study.slug === project.slug))
    .map((project) => ({
      slug: project.slug,
      name: project.name,
      kind: 'Published project',
      summary: project.summary,
      purpose: project.description || project.summary,
      problem: '',
      technologies: project.technologies,
      architecture: [],
      contribution: [],
      challenges: [],
      featured: project.featured,
      repositoryUrl: project.repositoryUrl,
      demoUrl: project.demoUrl,
    }))

  return (
    <section className="page inner-page">
      <p className="eyebrow">PROJECTS</p>
      <h1>Work and study projects.</h1>
      <p className="page-intro">These are the projects I can describe from available evidence. Academic group and database work is presented as such, not as commercial experience.</p>
      <div className="project-list">
        {caseStudies.map((study) => (
          <Link className="project-row" to={`/projects/${study.slug}`} key={study.slug}>
            <div className="project-row-index">{String(caseStudies.indexOf(study) + 1).padStart(2, '0')}</div>
            <div className="project-row-main">
              <p className="project-kind">{study.kind}</p>
              <h2>{study.name}</h2>
              <p>{study.summary}</p>
            </div>
            <div className="project-row-tools">{study.technologies.slice(0, 4).join(' · ')}</div>
            <ArrowUpRight size={18} />
          </Link>
        ))}
        {loading ? <Loading /> : additionalProjects.map((project) => (
          <Link className="project-row" to={`/projects/${project.slug}`} key={project.slug}>
            <div className="project-row-index"><Github size={20} /></div>
            <div className="project-row-main"><p className="project-kind">Published project</p><h2>{project.name}</h2><p>{project.summary}</p></div>
            <div className="project-row-tools">{project.technologies.slice(0, 4).join(' · ')}</div>
            <ArrowUpRight size={18} />
          </Link>
        ))}
      </div>
      {error && <p className="inline-error">{error}</p>}
    </section>
  )
}

function ProjectDetail() {
  const { slug } = useParams()
  const [apiProject, setApiProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const study = caseStudies.find((item) => item.slug === slug)

  useEffect(() => {
    if (!slug || study) {
      return
    }
    api<{ project: Project }>(`/api/projects/${slug}`)
      .then((data) => setApiProject(data.project))
      .catch((issue) => setError(issue instanceof Error ? issue.message : 'Project not found'))
      .finally(() => setLoading(false))
  }, [slug, study])

  if (!study && loading) return <section className="page inner-page"><Loading /></section>
  if (!study && error) return <section className="page inner-page"><div className="error-state">{error}</div><Link className="button" to="/projects">Back to projects</Link></section>

  const project: CaseStudy | null = study || (apiProject ? {
    slug: apiProject.slug,
    name: apiProject.name,
    kind: 'Published project',
    summary: apiProject.summary,
    purpose: apiProject.description || apiProject.summary,
    problem: '',
    technologies: apiProject.technologies,
    architecture: [],
    contribution: [],
    challenges: [],
    featured: apiProject.featured,
    repositoryUrl: apiProject.repositoryUrl,
    demoUrl: apiProject.demoUrl,
  } : null)

  if (!project) return <section className="page inner-page"><div className="error-state">Project not found</div></section>

  return (
    <article className="page inner-page case-study">
      <Link className="back-link" to="/projects">← All projects</Link>
      <p className="eyebrow">{project.kind}</p>
      <h1>{project.name}</h1>
      <p className="detail-summary">{project.summary}</p>
      <div className="case-meta"><div><span>Purpose</span><p>{project.purpose}</p></div><div><span>Technologies</span><p>{project.technologies.join(', ')}</p></div></div>
      {project.problem && <CaseSection number="01" title="Problem" copy={project.problem} />}
      {project.architecture.length > 0 && <CaseSection number="02" title="Architecture" items={project.architecture} />}
      {project.contribution.length > 0 && <CaseSection number="03" title="Liam's contribution" items={project.contribution} />}
      {project.challenges.length > 0 && <CaseSection number="04" title="Challenges and decisions" items={project.challenges} />}
      <div className="actions">
        {project.demoUrl && <a className="button primary" href={project.demoUrl} target="_blank" rel="noreferrer">View project <ArrowUpRight size={16} /></a>}
        {project.repositoryUrl && <a className="button" href={project.repositoryUrl} target="_blank" rel="noreferrer">Repository <Github size={16} /></a>}
      </div>
    </article>
  )
}

function CaseSection({ number, title, copy, items }: { number: string; title: string; copy?: string; items?: string[] }) {
  return (
    <section className="case-section">
      <div className="case-number">{number}</div>
      <div><h2>{title}</h2>{copy && <p>{copy}</p>}{items && <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>}</div>
    </section>
  )
}

function About() {
  return (
    <section className="page inner-page about-page">
      <p className="eyebrow">ABOUT LIAM</p>
      <div className="about-heading"><h1>Learning by building, from the data layer outward.</h1><PortraitPlaceholder /></div>
      <div className="about-columns">
        <div>
          <h2>My direction</h2>
          <p>I am Liam Victor Sirbon, a software engineering student based in Cape Town. I work across web applications, APIs, databases and mobile development, and I am most interested in how separate parts of a system fit together.</p>
          <p>At CPUT, I completed a Higher Certificate in 2024 and am pursuing a Diploma in IT Applications Development, expected in 2027. My studies and projects have given me practical experience with React, JavaScript, Java, Python, C++, Spring Boot, Flutter/Dart, MySQL and Linux.</p>
        </div>
        <div>
          <h2>How I work</h2>
          <p>I start with the actual problem: what information needs to move through the system, who needs to use it and where the design could break. That leads into database structure, application boundaries and deployment decisions.</p>
          <p>I have worked as a class representative and group leader. Those roles taught me to communicate clearly, divide work fairly and keep a team moving through incomplete or changing requirements.</p>
        </div>
      </div>
      <div className="principles">
        <div><strong>01</strong><h2>Understand the problem</h2><p>Clarify requirements and data before choosing an implementation.</p></div>
        <div><strong>02</strong><h2>Build the full path</h2><p>Consider interface, backend, database and deployment as one system.</p></div>
        <div><strong>03</strong><h2>Keep learning</h2><p>Use each project to improve engineering judgment and practical judgment.</p></div>
      </div>
    </section>
  )
}

function Experience() {
  return (
    <section className="page inner-page">
      <p className="eyebrow">EXPERIENCE & EDUCATION</p>
      <h1>A practical course of study.</h1>
      <div className="timeline-layout">
        <div>
          <h2>Education</h2>
          <div className="timeline">
            {education.map((item) => (
              <article key={item.title}><time>{item.period}</time><div><h3>{item.title}</h3><p className="timeline-place">{item.institution}</p><p>{item.detail}</p></div></article>
            ))}
          </div>
        </div>
        <div>
          <h2>Leadership and collaboration</h2>
          <div className="timeline">
            {experience.map((item) => (
              <article key={item.title}><time>{item.period}</time><div><h3>{item.title}</h3><p>{item.detail}</p></div></article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Skills() {
  return (
    <section className="page inner-page skills-page">
      <p className="eyebrow">SKILLS</p>
      <h1>Tools by purpose.</h1>
      <p className="page-intro">The following reflects Liam's technical experience across study and practical development work. It is grouped by use rather than represented as arbitrary percentages.</p>
      <div className="skill-category-grid">
        {skillGroups.map((group) => (
          <article key={group.title}>
            {group.title === 'Databases' ? <Database size={22} /> : <Layers3 size={22} />}
            <h2>{group.title}</h2>
            <ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        ))}
      </div>
    </section>
  )
}

function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    api<{ reviews: Review[] }>('/api/reviews')
      .then((data) => setReviews(data.reviews))
      .finally(() => setLoading(false))
  }, [])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      await api('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          rating: Number(form.get('rating')),
          review: form.get('review'),
          projectReference: form.get('projectReference'),
          website: form.get('website'),
        }),
      })
      setSubmitted(true)
      event.currentTarget.reset()
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to submit review')
    }
  }
  return (
    <section className="page inner-page">
      <p className="eyebrow">REVIEWS</p>
      <h1>Client feedback</h1>
      {loading ? <Loading /> : reviews.length === 0 ? <div className="empty-state">No approved reviews are published.</div> : (
        <div className="reviews-grid">{reviews.map((item) => (
          <article key={item.id}>
            <div className="stars" aria-label={`${item.rating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={16} fill={star <= item.rating ? 'currentColor' : 'none'} />)}
            </div>
            <blockquote>{item.review}</blockquote>
            <p>{item.name}{item.project_reference ? ` · ${item.project_reference}` : ''}</p>
          </article>
        ))}</div>
      )}
      <div className="form-section">
        <div><p className="eyebrow">SUBMIT A REVIEW</p><h2>Share your experience.</h2></div>
        {submitted ? <div className="success-state"><Check size={18} /> Submitted for moderation.</div> : (
          <form className="contact-form" onSubmit={submit}>
            <label>Name<input name="name" required minLength={2} maxLength={100} /></label>
            <label>Rating<select name="rating" required defaultValue="5"><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Average</option><option value="2">2 — Fair</option><option value="1">1 — Poor</option></select></label>
            <label>Project reference (optional)<input name="projectReference" maxLength={160} /></label>
            <label className="full">Review<textarea name="review" required minLength={10} maxLength={2000} /></label>
            <div className="honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            {error && <div className="error-state full">{error}</div>}
            <button className="button primary" type="submit">Submit review</button>
          </form>
        )}
      </div>
    </section>
  )
}

function Contact() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      await api('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          company: form.get('company'),
          projectType: form.get('projectType'),
          budget: form.get('budget'),
          description: form.get('description'),
          preferredContact: form.get('preferredContact'),
          phone: form.get('phone'),
          website: form.get('website'),
        }),
      })
      setSubmitted(true)
      event.currentTarget.reset()
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to send enquiry')
    }
  }
  return (
    <section className="page inner-page contact-page">
      <div>
        <p className="eyebrow">CONTACT LIAM</p>
        <h1>Opportunity or project?</h1>
        <p className="hero-copy">Use the form for graduate or junior opportunities, collaboration, or a practical development project. A short description of the problem and expected outcome is most useful.</p>
      </div>
      {submitted ? <div className="success-state"><Check size={18} /> Your enquiry was received.</div> : (
        <form className="contact-form" onSubmit={submit}>
          <label>Name<input name="name" required minLength={2} maxLength={100} /></label>
          <label>Email<input name="email" type="email" required maxLength={254} /></label>
          <label>Company or organisation (optional)<input name="company" maxLength={160} /></label>
          <label>Project type<select name="projectType" required defaultValue="web-app"><option value="web-app">Web application</option><option value="api">API or integration</option><option value="automation">Automation</option><option value="consulting">Technical collaboration</option><option value="other">Employment or other</option></select></label>
          <label>Budget (optional)<select name="budget" defaultValue="not-sure"><option value="under-5k">Under £5k</option><option value="5k-10k">£5k–£10k</option><option value="10k-25k">£10k–£25k</option><option value="25k-plus">£25k+</option><option value="not-sure">Not sure</option></select></label>
          <label>Preferred contact<select name="preferredContact" required defaultValue="email"><option value="email">Email</option><option value="phone">Phone</option></select></label>
          <label className="full">Project or opportunity description<textarea name="description" required minLength={20} maxLength={5000} /></label>
          <label>Phone (optional)<input name="phone" maxLength={40} /></label>
          <div className="honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          {error && <div className="error-state full">{error}</div>}
          <button className="button primary" type="submit">Send enquiry <ArrowRight size={16} /></button>
        </form>
      )}
    </section>
  )
}

function AdminLogin() {
  const [status, setStatus] = useState<'checking' | 'signed-out'>('checking')
  useEffect(() => {
    api<{ authenticated?: boolean }>('/api/admin/status')
      .then((data) => setStatus(data.authenticated ? 'signed-out' : 'signed-out'))
      .catch(() => setStatus('signed-out'))
  }, [])
  return (
    <section className="page inner-page admin-login">
      <p className="eyebrow">ADMINISTRATION</p>
      <h1>Content console</h1>
      {status === 'checking' ? <Loading /> : (
        <>
          <p>Sign in with Liam's configured GitHub administrator account.</p>
          <a className="button primary" href="/api/auth/github"><Github size={16} /> Continue with GitHub</a>
        </>
      )}
    </section>
  )
}

function AdminDashboard() {
  const [section, setSection] = useState('overview')
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [csrf, setCsrf] = useState('')
  const [data, setData] = useState<Record<string, unknown>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = useCallback(async (active = section) => {
    setLoading(true)
    setError('')
    try {
      const status = await api<{ authenticated: boolean; csrfToken: string }>('/api/admin/status')
      setAuthenticated(status.authenticated)
      setCsrf(status.csrfToken)
      const path = active === 'overview' ? '/api/admin/overview'
        : active === 'repositories' ? '/api/admin/projects'
        : active === 'enquiries' ? '/api/admin/enquiries'
        : active === 'reviews' ? '/api/admin/reviews'
        : active === 'settings' ? '/api/admin/settings'
        : '/api/admin/projects'
      setData(await api<Record<string, unknown>>(path))
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to load administration data')
      setAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }, [section])
  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])
  async function adminRequest(path: string, method = 'POST', body?: unknown) {
    await api(path, { method, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: body ? JSON.stringify(body) : undefined })
    await load(section)
  }
  if (authenticated === false) return <section className="page inner-page"><p className="eyebrow">ADMINISTRATION</p><h1>Authentication required</h1><Link className="button primary" to="/admin">Sign in</Link></section>
  const projects = (data.projects as Array<Record<string, unknown>> | undefined) || []
  const enquiries = (data.enquiries as Array<Record<string, unknown>> | undefined) || []
  const reviews = (data.reviews as Array<Record<string, unknown>> | undefined) || []
  return (
    <section className="page admin-dashboard">
      <aside><p className="eyebrow">DASHBOARD</p><nav>{['overview', 'repositories', 'enquiries', 'reviews', 'settings'].map((item) => (
        <button className={section === item ? 'active' : ''} key={item} onClick={() => { setSection(item); void load(item) }}>{item[0].toUpperCase() + item.slice(1)}</button>
      ))}</nav></aside>
      <div className="dashboard-main">
        {loading ? <Loading /> : error ? <div className="error-state">{error}</div> : (
          <>
            {section === 'overview' && <><h1>Overview</h1><div className="stat-grid"><div><span>Projects</span><strong>{String(data.projectCount ?? 0)}</strong></div><div><span>New enquiries</span><strong>{String(data.newEnquiryCount ?? 0)}</strong></div><div><span>Pending reviews</span><strong>{String(data.pendingReviewCount ?? 0)}</strong></div></div></>}
            {section === 'repositories' && <><div className="dashboard-heading"><h1>Repositories</h1><button className="button" onClick={() => void adminRequest('/api/admin/projects/sync')}><RefreshCw size={15} /> Synchronize</button></div>{projects.length === 0 ? <div className="empty-state">No repositories synchronized.</div> : <div className="admin-table">{projects.map((project) => <article key={String(project.id)}><div><strong>{String(project.name)}</strong><small>{String(project.repository_full_name || 'Manual project')}{project.is_private ? ' · Private' : ' · Public'}</small></div><div className="toggle-row"><button className={dbBoolean(project.published) ? 'active' : ''} onClick={() => void adminRequest(`/api/admin/projects/${project.slug}`, 'PUT', { name: project.name, summary: project.summary, description: project.description, publicName: project.public_name, publicSummary: project.public_summary, publicDescription: project.public_description, demoUrl: project.demo_url, technologies: typeof project.technologies === 'string' ? JSON.parse(String(project.technologies)) : project.technologies, featured: dbBoolean(project.featured), published: !dbBoolean(project.published), excluded: dbBoolean(project.excluded), sortOrder: Number(project.sort_order || 0) })}>Published</button><button className={dbBoolean(project.featured) ? 'active' : ''} onClick={() => void adminRequest(`/api/admin/projects/${project.slug}`, 'PUT', { name: project.name, summary: project.summary, description: project.description, publicName: project.public_name, publicSummary: project.public_summary, publicDescription: project.public_description, demoUrl: project.demo_url, technologies: typeof project.technologies === 'string' ? JSON.parse(String(project.technologies)) : project.technologies, featured: !dbBoolean(project.featured), published: dbBoolean(project.published), excluded: dbBoolean(project.excluded), sortOrder: Number(project.sort_order || 0) })}>Featured</button><button className={dbBoolean(project.excluded) ? 'active' : ''} onClick={() => void adminRequest(`/api/admin/projects/${project.slug}`, 'PUT', { name: project.name, summary: project.summary, description: project.description, publicName: project.public_name, publicSummary: project.public_summary, publicDescription: project.public_description, demoUrl: project.demo_url, technologies: typeof project.technologies === 'string' ? JSON.parse(String(project.technologies)) : project.technologies, featured: dbBoolean(project.featured), published: dbBoolean(project.published), excluded: !dbBoolean(project.excluded), sortOrder: Number(project.sort_order || 0) })}>Excluded</button></div></article>)}</div>}</>}
            {section === 'enquiries' && <><h1>Customer enquiries</h1>{enquiries.length === 0 ? <div className="empty-state">No enquiries.</div> : <div className="admin-list">{enquiries.map((item) => <article key={String(item.id)}><div><strong>{String(item.name)}</strong><small>{String(item.email)} · {String(item.project_type)} · {String(item.status)}</small><p>{String(item.description)}</p></div><button className="button" onClick={() => void adminRequest('/api/admin/enquiries', 'PATCH', { id: item.id, status: item.status === 'read' ? 'archived' : 'read' })}>{item.status === 'read' ? 'Archive' : 'Mark read'}</button></article>)}</div>}</>}
            {section === 'reviews' && <><h1>Review moderation</h1>{reviews.length === 0 ? <div className="empty-state">No reviews.</div> : <div className="admin-list">{reviews.map((item) => <article key={String(item.id)}><div><strong>{String(item.name)} · {String(item.rating)}/5</strong><p>{String(item.review)}</p><small>Status: {String(item.status)}</small></div><div className="toggle-row"><button onClick={() => void adminRequest('/api/admin/reviews', 'PATCH', { id: item.id, status: 'approved' })}>Approve</button><button onClick={() => void adminRequest('/api/admin/reviews', 'PATCH', { id: item.id, status: 'rejected' })}>Reject</button><button onClick={() => void adminRequest('/api/admin/reviews', 'PATCH', { id: item.id, status: 'removed' })}>Remove</button></div></article>)}</div>}</>}
            {section === 'settings' && <><h1>Site settings</h1><div className="empty-state">Settings API is available. Add deployment-specific fields through a controlled migration or API update.</div></>}
          </>
        )}
      </div>
    </section>
  )
}

function NotFound() {
  return <section className="page inner-page not-found"><p className="eyebrow">404</p><h1>Page not found.</h1><Link className="button" to="/">Return home</Link></section>
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/experience" element={<Experience />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:slug" element={<ProjectDetail />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Shell>
  )
}
