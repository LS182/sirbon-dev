import { ArrowUpRight, Layers3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CaseStudy } from '../types/project'

export function ProjectCard({ project }: { project: CaseStudy }) {
  return (
    <Link className="featured-project" to={`/projects/${project.slug}`}>
      <div className="project-marker">
        <Layers3 size={18} aria-hidden="true" />
        <span>{project.kind}</span>
      </div>
      <h3>{project.name}</h3>
      <p>{project.summary}</p>
      <div className="tags">
        {project.technologies.slice(0, 5).map((item) => <span key={item}>{item}</span>)}
      </div>
      <span className="text-link">
        Read case study <ArrowUpRight size={15} aria-hidden="true" />
      </span>
    </Link>
  )
}
