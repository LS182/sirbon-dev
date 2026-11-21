export type ProjectKind = 'University group project' | 'Database design assignment' | 'Published project'

export interface PublicProject {
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
}

export interface CaseStudy {
  slug: string
  name: string
  kind: ProjectKind
  summary: string
  purpose: string
  problem: string
  technologies: string[]
  architecture: string[]
  contribution: string[]
  challenges: string[]
  features?: string[]
  lessons?: string[]
  featured: boolean
  repositoryUrl?: string
  demoUrl?: string
}
