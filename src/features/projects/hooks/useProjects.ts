import { useEffect, useState } from 'react'
import { caseStudies } from '../data/caseStudies'
import { fetchPublicProjectBySlug, fetchPublicProjects, mapPublicProjectToCaseStudy } from '../services/projectsApi'
import type { CaseStudy, PublicProject } from '../types/project'

export function usePublicProjects() {
  const [publishedProjects, setPublishedProjects] = useState<PublicProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetchPublicProjects()
      .then((projects) => {
        if (active) setPublishedProjects(projects)
      })
      .catch((issue) => {
        if (active) setError(issue instanceof Error ? issue.message : 'Unable to load synchronized projects')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const additionalProjects: CaseStudy[] = publishedProjects
    .filter((project) => !caseStudies.some((study) => study.slug === project.slug))
    .map(mapPublicProjectToCaseStudy)

  const allProjects = [...caseStudies, ...additionalProjects]
  const featuredProjects = allProjects.filter((project) => project.featured)

  return {
    allProjects,
    additionalProjects,
    featuredProjects,
    loading,
    error,
  }
}

export function useProjectDetail(slug: string | undefined) {
  const study = caseStudies.find((item) => item.slug === slug)
  const [apiProject, setApiProject] = useState<PublicProject | null>(null)
  const [loading, setLoading] = useState(!study)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug || study) return
    let active = true
    fetchPublicProjectBySlug(slug)
      .then((project) => {
        if (active) setApiProject(project)
      })
      .catch((issue) => {
        if (active) setError(issue instanceof Error ? issue.message : 'Project not found')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [slug, study])

  const project: CaseStudy | null = study || (apiProject ? mapPublicProjectToCaseStudy(apiProject) : null)

  return {
    project,
    loading: !study && loading,
    error: !study ? error : '',
  }
}
