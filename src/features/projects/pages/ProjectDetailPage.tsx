import { ArrowLeft, ArrowRight, ArrowUpRight, Github } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBanner, LoadingState } from '../../../shared/components'
import { usePageTitle } from '../../../shared/hooks/usePageTitle'
import { CaseStudySection } from '../components/CaseStudySection'
import { caseStudies } from '../data/caseStudies'
import { useProjectDetail } from '../hooks/useProjects'

export function ProjectDetailPage() {
  const { slug } = useParams()
  const { project, loading, error } = useProjectDetail(slug)

  usePageTitle(project?.name || 'Project Case Study')

  if (loading) {
    return (
      <section className="page inner-page">
        <LoadingState label="Loading project…" />
      </section>
    )
  }

  if (error || !project) {
    return (
      <section className="page inner-page">
        <ErrorBanner message={error || 'Project not found'} />
        <div className="actions">
          <Link className="button" to="/projects">Back to projects</Link>
        </div>
      </section>
    )
  }

  const sections: Array<{ title: string; copy?: string; items?: string[] }> = []
  if (project.problem) sections.push({ title: 'Problem', copy: project.problem })
  if (project.features && project.features.length > 0) {
    sections.push({ title: 'Key features & deliverables', items: project.features })
  }
  if (project.architecture.length > 0) sections.push({ title: 'Architecture', items: project.architecture })
  if (project.contribution.length > 0) sections.push({ title: "Liam's contribution", items: project.contribution })
  if (project.challenges.length > 0) {
    sections.push({ title: 'Challenges and technical decisions', items: project.challenges })
  }
  if (project.lessons && project.lessons.length > 0) {
    sections.push({ title: 'Lessons learned', items: project.lessons })
  }

  const nextStudy = caseStudies.find((item) => item.slug !== project.slug)

  return (
    <article className="page inner-page case-study">
      <Link className="back-link" to="/projects">
        <ArrowLeft size={15} aria-hidden="true" /> All projects
      </Link>

      <header className="case-header">
        <p className="eyebrow">{project.kind}</p>
        <h1>{project.name}</h1>
        <p className="detail-summary">{project.summary}</p>
      </header>

      <div className="case-meta">
        <div>
          <span>Purpose</span>
          <p>{project.purpose}</p>
        </div>
        <div>
          <span>Technologies</span>
          <div className="tags">
            {project.technologies.map((tech) => <span key={tech}>{tech}</span>)}
          </div>
        </div>
      </div>

      {sections.map((section, idx) => (
        <CaseStudySection
          key={section.title}
          number={String(idx + 1).padStart(2, '0')}
          title={section.title}
          copy={section.copy}
          items={section.items}
        />
      ))}

      {(project.demoUrl || project.repositoryUrl) && (
        <div className="actions">
          {project.demoUrl && (
            <a className="button primary" href={project.demoUrl} target="_blank" rel="noreferrer">
              View live project <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          )}
          {project.repositoryUrl && (
            <a className="button" href={project.repositoryUrl} target="_blank" rel="noreferrer">
              Public repository <Github size={16} aria-hidden="true" />
            </a>
          )}
        </div>
      )}

      {nextStudy && (
        <aside className="next-case-study" aria-label="Next case study">
          <div>
            <p className="eyebrow">NEXT CASE STUDY</p>
            <h2>{nextStudy.name}</h2>
            <p>{nextStudy.summary}</p>
          </div>
          <Link className="button" to={`/projects/${nextStudy.slug}`}>
            Read {nextStudy.name} <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </aside>
      )}
    </article>
  )
}
