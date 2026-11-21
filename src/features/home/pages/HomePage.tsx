import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, PortraitCard } from '../../../shared/components'
import { usePageTitle } from '../../../shared/hooks/usePageTitle'
import { profile } from '../../about'
import { ProjectCard, usePublicProjects } from '../../projects'
import { skillGroups } from '../../skills'

export function HomePage() {
  usePageTitle('Software Engineering Portfolio')
  const { featuredProjects } = usePublicProjects()

  return (
    <div className="page">
      <section className="hero identity-hero">
        <div className="hero-copy-block">
          <p className="eyebrow">SOFTWARE ENGINEERING STUDENT · FULL-STACK DEVELOPER</p>
          <h1>
            Liam<br />
            <em>Victor Sirbon</em>
          </h1>
          <p className="hero-copy">{profile.introduction}</p>
          <p className="location-line">Based in {profile.location}</p>
          <div className="actions">
            <Link className="button primary" to="/projects">
              View my projects <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link className="button" to="/contact">Contact Liam</Link>
          </div>
        </div>
        <PortraitCard />
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>01 / Selected work</h2>
          <Link to="/projects">
            View all projects <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
        {featuredProjects.length === 0 ? (
          <EmptyState message="No public projects are published yet." />
        ) : (
          <div className="featured-projects">
            {featuredProjects.slice(0, 3).map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        )}
      </section>

      <section className="section skills-preview">
        <div>
          <p className="eyebrow">02 / TECHNICAL RANGE</p>
          <h2>Built across the stack.</h2>
          <p className="section-subcopy">
            Practical experience spanning relational database design, backend REST APIs, and responsive React and Flutter interfaces.
          </p>
          <div className="actions">
            <Link className="button" to="/skills">Explore all skills</Link>
            <Link className="button" to="/services">What I build</Link>
          </div>
        </div>
        <div className="skill-preview-grid">
          {skillGroups.map((group) => (
            <div key={group.id}>
              <h3>{group.title}</h3>
              <p>{group.items.join(' · ')}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section home-contact">
        <div>
          <p className="eyebrow">03 / GET IN TOUCH</p>
          <h2>Looking for a developer for an opportunity or project?</h2>
        </div>
        <Link className="button primary" to="/contact">
          Start a conversation <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
    </div>
  )
}
