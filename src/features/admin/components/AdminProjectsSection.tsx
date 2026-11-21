import { Globe, Lock, RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ProjectUpdate } from '../../../../shared/schemas'
import { EmptyState, ErrorBanner } from '../../../shared/components'
import { dbBoolean, formatShortDate, parseTechnologies } from '../../../shared/utils/format'
import type { AdminProjectRecord, SyncRecord } from '../types/admin'

type RepoFilter = 'all' | 'published' | 'unpublished' | 'public' | 'private'

interface AdminProjectsSectionProps {
  projects: AdminProjectRecord[]
  lastSync: SyncRecord | null
  syncWarning: string | null
  busy: boolean
  onSync: () => Promise<void>
  onUpdateProject: (slug: string, payload: ProjectUpdate, message: string) => Promise<void>
}

export function AdminProjectsSection({
  projects,
  lastSync,
  syncWarning,
  busy,
  onSync,
  onUpdateProject,
}: AdminProjectsSectionProps) {
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [filter, setFilter] = useState<RepoFilter>('all')
  const [query, setQuery] = useState('')

  const counts = useMemo(() => {
    let published = 0
    let unpublished = 0
    let publicRepos = 0
    let privateRepos = 0
    for (const p of projects) {
      const isPublished = dbBoolean(p.published) && !dbBoolean(p.excluded)
      if (isPublished) published++
      else unpublished++
      if (dbBoolean(p.is_private)) privateRepos++
      else publicRepos++
    }
    return { all: projects.length, published, unpublished, public: publicRepos, private: privateRepos }
  }, [projects])

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase()
    return projects.filter((project) => {
      const isPrivate = dbBoolean(project.is_private)
      const isPublished = dbBoolean(project.published) && !dbBoolean(project.excluded)

      if (filter === 'published' && !isPublished) return false
      if (filter === 'unpublished' && isPublished) return false
      if (filter === 'public' && isPrivate) return false
      if (filter === 'private' && !isPrivate) return false

      if (q) {
        const haystack = [
          project.name,
          project.public_name || '',
          project.repository_full_name || '',
          project.language || '',
        ].join(' ').toLowerCase()
        return haystack.includes(q)
      }
      return true
    })
  }, [projects, filter, query])

  const filterTabs: Array<{ id: RepoFilter; label: string; count: number }> = [
    { id: 'all', label: 'All discovered', count: counts.all },
    { id: 'published', label: 'Published', count: counts.published },
    { id: 'unpublished', label: 'Unpublished', count: counts.unpublished },
    { id: 'public', label: 'Public repos', count: counts.public },
    { id: 'private', label: 'Private repos', count: counts.private },
  ]

  return (
    <>
      <div className="dashboard-heading">
        <div>
          <h1>Repositories</h1>
          <p className="dashboard-subtitle">
            {lastSync
              ? `Last sync (${lastSync.status}): ${lastSync.repository_count} discovered (${lastSync.public_count} public, ${lastSync.private_count} private) · ${formatShortDate(lastSync.completed_at || lastSync.started_at)}`
              : 'Repositories are discovered automatically from your authorized GitHub App installation.'}
          </p>
        </div>
        <button type="button" className="button primary" disabled={busy} onClick={() => void onSync()}>
          <RefreshCw size={15} className={busy ? 'spin' : undefined} aria-hidden="true" />
          {busy ? 'Synchronizing…' : 'Synchronize now'}
        </button>
      </div>

      {syncWarning && <ErrorBanner message={`GitHub sync warning: ${syncWarning}`} />}

      <div className="repo-toolbar">
        <div className="filter-bar" role="group" aria-label="Filter discovered repositories">
          {filterTabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              className={filter === tab.id ? 'filter-chip active' : 'filter-chip'}
              aria-pressed={filter === tab.id}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label} <span className="chip-count">{tab.count}</span>
            </button>
          ))}
        </div>

        <search className="repo-search">
          <label htmlFor="admin-repo-search" className="visually-hidden">Search repositories</label>
          <Search size={15} aria-hidden="true" />
          <input
            id="admin-repo-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by repository name…"
          />
        </search>
      </div>

      {projects.length === 0 ? (
        <EmptyState message="No repositories discovered yet. Verify GitHub App installation permissions or run Synchronize now." />
      ) : filteredProjects.length === 0 ? (
        <EmptyState message="No repositories match the selected filter or search term." />
      ) : (
        <div className="admin-table">
          {filteredProjects.map((project) => {
            const isPrivate = dbBoolean(project.is_private)
            const isPublished = dbBoolean(project.published)
            const isExcluded = dbBoolean(project.excluded)
            const isFeatured = dbBoolean(project.featured)
            const isEditing = editingSlug === project.slug
            const currentTechs = parseTechnologies(project.technologies)
            const hasApprovedPrivateCopy = Boolean(
              project.public_name?.trim()
              && project.public_summary?.trim()
              && project.public_description?.trim(),
            )

            const basePayload: ProjectUpdate = {
              name: project.name || '',
              summary: project.summary || '',
              description: project.description || null,
              publicName: project.public_name || null,
              publicSummary: project.public_summary || null,
              publicDescription: project.public_description || null,
              demoUrl: project.demo_url || null,
              technologies: currentTechs,
              featured: isFeatured,
              published: isPublished,
              excluded: isExcluded,
              sortOrder: Number(project.sort_order || 0),
            }

            return (
              <article className="admin-project-item" key={project.id}>
                <div className="admin-project-row">
                  <div className="admin-project-meta">
                    <div className="admin-title-row">
                      <strong>{project.public_name || project.name}</strong>
                      <span className={isPrivate ? 'status-badge status-private' : 'status-badge status-public'}>
                        {isPrivate ? <Lock size={11} aria-hidden="true" /> : <Globe size={11} aria-hidden="true" />}
                        {isPrivate ? 'Private' : 'Public'}
                      </span>
                      <span className={isPublished && !isExcluded ? 'status-badge status-approved' : 'status-badge'}>
                        {isPublished && !isExcluded ? 'Published' : isExcluded ? 'Excluded' : 'Unpublished'}
                      </span>
                    </div>
                    <small>
                      {project.repository_full_name || 'Local record'}
                      {project.language && !isPrivate ? ` · ${project.language}` : ''}
                      {project.default_branch ? ` · ${project.default_branch}` : ''}
                      {project.synced_at ? ` · Synced ${formatShortDate(project.synced_at)}` : ''}
                    </small>
                    {isPrivate && !hasApprovedPrivateCopy && (
                      <small className="private-note">
                        Private repository — author public name, summary and description before publishing.
                      </small>
                    )}
                  </div>

                  <div className="toggle-row">
                    <button
                      type="button"
                      disabled={busy}
                      className={isPublished && !isExcluded ? 'active' : ''}
                      aria-pressed={isPublished && !isExcluded}
                      onClick={() => {
                        const nextPublished = !isPublished
                        void onUpdateProject(
                          project.slug,
                          {
                            ...basePayload,
                            published: nextPublished,
                            excluded: nextPublished ? false : isExcluded,
                          },
                          nextPublished ? 'Project published to portfolio.' : 'Project unpublished.',
                        )
                      }}
                    >
                      {isPublished && !isExcluded ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className={isFeatured ? 'active' : ''}
                      aria-pressed={isFeatured}
                      onClick={() => void onUpdateProject(project.slug, { ...basePayload, featured: !isFeatured }, 'Featured status updated.')}
                    >
                      Featured
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className={isExcluded ? 'active' : ''}
                      aria-pressed={isExcluded}
                      onClick={() => void onUpdateProject(project.slug, { ...basePayload, excluded: !isExcluded, published: !isExcluded ? false : isPublished }, 'Exclusion status updated.')}
                    >
                      Excluded
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSlug(isEditing ? null : project.slug)}
                    >
                      {isEditing ? 'Close' : 'Review & edit'}
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <form
                    className="admin-edit-form"
                    onSubmit={(event) => {
                      event.preventDefault()
                      const formData = new FormData(event.currentTarget)
                      const techs = String(formData.get('technologies') || '')
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean)

                      void onUpdateProject(
                        project.slug,
                        {
                          ...basePayload,
                          name: String(formData.get('name') || project.name),
                          summary: isPrivate ? '' : String(formData.get('summary') || ''),
                          description: isPrivate ? null : (String(formData.get('description') || '') || null),
                          publicName: String(formData.get('publicName') || '') || null,
                          publicSummary: String(formData.get('publicSummary') || '') || null,
                          publicDescription: String(formData.get('publicDescription') || '') || null,
                          demoUrl: isPrivate ? null : (String(formData.get('demoUrl') || '') || null),
                          technologies: techs,
                          sortOrder: Number(formData.get('sortOrder') || 0),
                        },
                        'Project details saved.',
                      ).then(() => setEditingSlug(null))
                    }}
                  >
                    <div className="form-field">
                      <label htmlFor={`name-${project.slug}`}>Repository name</label>
                      <input id={`name-${project.slug}`} name="name" defaultValue={project.name || ''} required />
                    </div>
                    <div className="form-field">
                      <label htmlFor={`pub-name-${project.slug}`}>Public case-study title {isPrivate ? '*' : '(optional)'}</label>
                      <input id={`pub-name-${project.slug}`} name="publicName" defaultValue={project.public_name || ''} />
                    </div>
                    {!isPrivate && (
                      <div className="form-field">
                        <label htmlFor={`demo-${project.slug}`}>Live URL (optional)</label>
                        <input id={`demo-${project.slug}`} name="demoUrl" type="url" defaultValue={project.demo_url || ''} />
                      </div>
                    )}
                    <div className="form-field">
                      <label htmlFor={`sort-${project.slug}`}>Display order</label>
                      <input id={`sort-${project.slug}`} name="sortOrder" type="number" defaultValue={Number(project.sort_order || 0)} />
                    </div>
                    <div className="form-field full">
                      <label htmlFor={`tech-${project.slug}`}>Technologies (comma-separated)</label>
                      <input id={`tech-${project.slug}`} name="technologies" defaultValue={currentTechs.join(', ')} />
                    </div>
                    <div className="form-field full">
                      <label htmlFor={`pub-sum-${project.slug}`}>Approved public summary {isPrivate ? '*' : '(optional override)'}</label>
                      <input id={`pub-sum-${project.slug}`} name="publicSummary" defaultValue={project.public_summary || ''} maxLength={500} />
                    </div>
                    <div className="form-field full">
                      <label htmlFor={`pub-desc-${project.slug}`}>Approved public description {isPrivate ? '*' : '(optional override)'}</label>
                      <textarea id={`pub-desc-${project.slug}`} name="publicDescription" defaultValue={project.public_description || ''} maxLength={5000} />
                    </div>
                    {!isPrivate && (
                      <>
                        <div className="form-field full">
                          <label htmlFor={`sum-${project.slug}`}>GitHub repository summary</label>
                          <input id={`sum-${project.slug}`} name="summary" defaultValue={project.summary || ''} maxLength={500} />
                        </div>
                        <div className="form-field full">
                          <label htmlFor={`desc-${project.slug}`}>Portfolio description</label>
                          <textarea id={`desc-${project.slug}`} name="description" defaultValue={project.description || ''} maxLength={5000} />
                        </div>
                      </>
                    )}
                    <div className="actions full">
                      <button type="submit" className="button primary" disabled={busy}>Save details</button>
                    </div>
                  </form>
                )}
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}
