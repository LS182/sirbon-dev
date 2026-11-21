import { useState } from 'react'
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from '../../../shared/components'
import { usePageTitle } from '../../../shared/hooks/usePageTitle'
import { ProjectRow } from '../components/ProjectRow'
import { usePublicProjects } from '../hooks/useProjects'

export function ProjectsPage() {
  usePageTitle('Projects')
  const { allProjects, additionalProjects, loading, error } = usePublicProjects()
  const [activeFilter, setActiveFilter] = useState<string>('All')

  const filterOptions = [
    'All',
    'University group project',
    'Database design assignment',
    ...(additionalProjects.length > 0 ? ['Published project'] : []),
  ]

  const visibleProjects = activeFilter === 'All'
    ? allProjects
    : allProjects.filter((item) => item.kind === activeFilter)

  return (
    <section className="page inner-page">
      <PageHeader
        eyebrow="PROJECTS"
        title="Work and study projects."
        intro="These are the projects I can describe from available evidence. Academic group and database work is presented as such, not as commercial experience."
      />

      <div className="filter-bar" role="group" aria-label="Filter projects by category">
        {filterOptions.map((category) => (
          <button
            type="button"
            key={category}
            className={activeFilter === category ? 'filter-chip active' : 'filter-chip'}
            aria-pressed={activeFilter === category}
            onClick={() => setActiveFilter(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="project-list">
        {visibleProjects.length === 0 && !loading ? (
          <EmptyState message="No projects match the selected filter." />
        ) : (
          visibleProjects.map((project, index) => (
            <ProjectRow key={project.slug} project={project} index={index} />
          ))
        )}
        {loading && <LoadingState label="Checking synchronized repositories…" />}
      </div>

      {error && <ErrorBanner message={error} />}
    </section>
  )
}
