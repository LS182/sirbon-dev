import { apiRequest } from '../../../shared/api/client'
import type { CaseStudy, PublicProject } from '../types/project'

export function mapPublicProjectToCaseStudy(project: PublicProject): CaseStudy {
  return {
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
  }
}

export async function fetchPublicProjects(): Promise<PublicProject[]> {
  const data = await apiRequest<{ projects: PublicProject[] }>('/api/projects')
  return data.projects
}

export async function fetchPublicProjectBySlug(slug: string): Promise<PublicProject> {
  const data = await apiRequest<{ project: PublicProject }>(`/api/projects/${encodeURIComponent(slug)}`)
  return data.project
}
