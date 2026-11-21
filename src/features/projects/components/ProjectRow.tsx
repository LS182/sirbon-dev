import { ArrowUpRight, Github } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CaseStudy } from '../types/project'

export function ProjectRow({ project, index }: { project: CaseStudy; index: number }) {
  return (
    <Link className="project-row" to={`/projects/${project.slug}`}>
      <div className="project-row-index">
        {project.kind === 'Published project' ? (
          <Github size={19} aria-hidden="true" />
        ) : (
          String(index + 1).padStart(2, '0')
        )}
      </div>
      <div className="project-row-main">
        <p className="project-kind">{project.kind}</p>
        <h2>{project.name}</h2>
        <p>{project.summary}</p>
        <div className="project-row-tags">
          {project.technologies.slice(0, 5).map((tech) => <span key={tech}>{tech}</span>)}
        </div>
      </div>
      <div className="project-row-tools">{project.technologies.slice(0, 4).join(' · ')}</div>
      <ArrowUpRight className="project-row-arrow" size={18} aria-hidden="true" />
    </Link>
  )
}
