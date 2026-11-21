import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import type { ProjectUpdate } from '../../../../shared/schemas'
import { EmptyState } from '../../../shared/components'
import { dbBoolean, parseTechnologies } from '../../../shared/utils/format'
import type { AdminProjectRecord } from '../types/admin'

interface AdminProjectsSectionProps {
  projects: AdminProjectRecord[]
  busy: boolean
  onSync: () => Promise<void>
  onUpdateProject: (slug: string, payload: ProjectUpdate, message: string) => Promise<void>
}

export function AdminProjectsSection({
  projects,
  busy,
  onSync,
  onUpdateProject,
}: AdminProjectsSectionProps) {
  const [editingSlug, setEditingSlug] = useState<string | null>(null)

  return (
    <>
      <div className="dashboard-heading">
        <h1>Repositories</h1>
        <button type="button" className="button" disabled={busy} onClick={() => void onSync()}>
          <RefreshCw size={15} className={busy ? 'spin' : undefined} aria-hidden="true" />
          {busy ? 'Synchronizing…' : 'Synchronize'}
        </button>
      </div>

      {projects.length === 0 ? (
        <EmptyState message="No repositories synchronized yet." />
      ) : (
        <div className="admin-table">
          {projects.map((project) => {
            const isPrivate = dbBoolean(project.is_private)
            const isEditing = editingSlug === project.slug
            const currentTechs = parseTechnologies(project.technologies)
            const basePayload: ProjectUpdate = {
              name: project.name || '',
              summary: project.summary || '',
              description: project.description || null,
              publicName: project.public_name || null,
              publicSummary: project.public_summary || null,
              publicDescription: project.public_description || null,
              demoUrl: project.demo_url || null,
              technologies: currentTechs,
              featured: dbBoolean(project.featured),
              published: dbBoolean(project.published),
              excluded: dbBoolean(project.excluded),
              sortOrder: Number(project.sort_order || 0),
            }

            return (
              <article className="admin-project-item" key={project.id}>
                <div className="admin-project-row">
                  <div>
                    <div className="admin-title-row">
                      <strong>{project.public_name || project.name}</strong>
                      <span className={isPrivate ? 'status-badge status-private' : 'status-badge status-public'}>
                        {isPrivate ? 'Private' : 'Public'}
                      </span>
                    </div>
                    <small>
                      {project.repository_full_name || 'Manual project'}
                      {isPrivate ? ' · Requires approved public case-study fields before publishing' : ''}
                    </small>
                  </div>

                  <div className="toggle-row">
                    <button
                      type="button"
                      disabled={busy}
                      className={dbBoolean(project.published) ? 'active' : ''}
                      aria-pressed={dbBoolean(project.published)}
                      onClick={() => void onUpdateProject(project.slug, { ...basePayload, published: !dbBoolean(project.published) }, 'Project visibility updated.')}
                    >
                      Published
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className={dbBoolean(project.featured) ? 'active' : ''}
                      aria-pressed={dbBoolean(project.featured)}
                      onClick={() => void onUpdateProject(project.slug, { ...basePayload, featured: !dbBoolean(project.featured) }, 'Featured status updated.')}
                    >
                      Featured
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className={dbBoolean(project.excluded) ? 'active' : ''}
                      aria-pressed={dbBoolean(project.excluded)}
                      onClick={() => void onUpdateProject(project.slug, { ...basePayload, excluded: !dbBoolean(project.excluded) }, 'Exclusion status updated.')}
                    >
                      Excluded
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSlug(isEditing ? null : project.slug)}
                    >
                      {isEditing ? 'Close' : 'Edit details'}
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
                          summary: String(formData.get('summary') || ''),
                          description: String(formData.get('description') || '') || null,
                          publicName: String(formData.get('publicName') || '') || null,
                          publicSummary: String(formData.get('publicSummary') || '') || null,
                          publicDescription: String(formData.get('publicDescription') || '') || null,
                          demoUrl: String(formData.get('demoUrl') || '') || null,
                          technologies: techs,
                          sortOrder: Number(formData.get('sortOrder') || 0),
                        },
                        'Project case study saved.',
                      ).then(() => setEditingSlug(null))
                    }}
                  >
                    <div className="form-field">
                      <label htmlFor={`name-${project.slug}`}>Internal name</label>
                      <input id={`name-${project.slug}`} name="name" defaultValue={project.name || ''} required />
                    </div>
                    <div className="form-field">
                      <label htmlFor={`pub-name-${project.slug}`}>Approved public name {isPrivate ? '*' : '(optional)'}</label>
                      <input id={`pub-name-${project.slug}`} name="publicName" defaultValue={project.public_name || ''} />
                    </div>
                    <div className="form-field">
                      <label htmlFor={`demo-${project.slug}`}>Demo URL (optional)</label>
                      <input id={`demo-${project.slug}`} name="demoUrl" type="url" defaultValue={project.demo_url || ''} />
                    </div>
                    <div className="form-field">
                      <label htmlFor={`sort-${project.slug}`}>Sort order</label>
                      <input id={`sort-${project.slug}`} name="sortOrder" type="number" defaultValue={Number(project.sort_order || 0)} />
                    </div>
                    <div className="form-field full">
                      <label htmlFor={`tech-${project.slug}`}>Technologies (comma-separated)</label>
                      <input id={`tech-${project.slug}`} name="technologies" defaultValue={currentTechs.join(', ')} />
                    </div>
                    <div className="form-field full">
                      <label htmlFor={`pub-sum-${project.slug}`}>Approved public summary {isPrivate ? '*' : '(optional)'}</label>
                      <input id={`pub-sum-${project.slug}`} name="publicSummary" defaultValue={project.public_summary || ''} maxLength={500} />
                    </div>
                    <div className="form-field full">
                      <label htmlFor={`pub-desc-${project.slug}`}>Approved public description {isPrivate ? '*' : '(optional)'}</label>
                      <textarea id={`pub-desc-${project.slug}`} name="publicDescription" defaultValue={project.public_description || ''} maxLength={5000} />
                    </div>
                    {!isPrivate && (
                      <>
                        <div className="form-field full">
                          <label htmlFor={`sum-${project.slug}`}>Public repository summary</label>
                          <input id={`sum-${project.slug}`} name="summary" defaultValue={project.summary || ''} maxLength={500} />
                        </div>
                        <div className="form-field full">
                          <label htmlFor={`desc-${project.slug}`}>Public repository description</label>
                          <textarea id={`desc-${project.slug}`} name="description" defaultValue={project.description || ''} maxLength={5000} />
                        </div>
                      </>
                    )}
                    <div className="actions full">
                      <button type="submit" className="button primary" disabled={busy}>Save project</button>
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
