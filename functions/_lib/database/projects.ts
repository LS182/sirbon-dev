import type { ProjectUpdate } from '../../../shared/schemas'
import type { ProjectRow } from './types'

function safeJsonParse<T>(value: unknown, fallback: T): T {
  try {
    return JSON.parse(String(value || '')) as T
  } catch {
    return fallback
  }
}

export function isPublicProjectVisible(row: Record<string, unknown>): boolean {
  if (row.published !== 1 && row.published !== true) return false
  if (row.excluded === 1 || row.excluded === true) return false
  if (row.is_private !== 1 && row.is_private !== true) return true
  return Boolean(
    typeof row.public_summary === 'string' && row.public_summary.trim()
    && typeof row.public_description === 'string' && row.public_description.trim()
    && typeof row.public_name === 'string' && row.public_name.trim(),
  )
}

export function publicProject(row: Record<string, unknown>) {
  // Fail closed: treat anything other than explicit 0/false as private.
  const privateProject = row.is_private !== 0 && row.is_private !== false
  return {
    id: row.id,
    slug: row.slug,
    name: privateProject ? row.public_name : (row.public_name || row.name),
    summary: privateProject ? row.public_summary : (row.public_summary || row.summary),
    description: privateProject ? row.public_description : (row.public_description || row.description),
    repositoryUrl: privateProject ? undefined : row.repository_url,
    demoUrl: privateProject ? undefined : row.demo_url,
    technologies: safeJsonParse<string[]>(row.technologies, []),
    featured: Boolean(row.featured),
    published: Boolean(row.published),
    updatedAt: row.updated_at,
  }
}

const PUBLIC_VISIBILITY_WHERE = `
  published = 1
  AND excluded = 0
  AND (
    is_private = 0
    OR (
      TRIM(COALESCE(public_name, '')) <> ''
      AND TRIM(COALESCE(public_summary, '')) <> ''
      AND TRIM(COALESCE(public_description, '')) <> ''
    )
  )
`

export async function listPublicProjects(db: D1Database) {
  const result = await db.prepare(`
    SELECT * FROM projects
    WHERE ${PUBLIC_VISIBILITY_WHERE}
    ORDER BY featured DESC, sort_order ASC, name ASC
  `).all<ProjectRow>()
  return (result.results || []).map((row) => publicProject(row as unknown as Record<string, unknown>))
}

export async function findPublicProjectBySlug(db: D1Database, slug: string) {
  const row = await db.prepare(`
    SELECT * FROM projects
    WHERE slug = ? AND ${PUBLIC_VISIBILITY_WHERE}
  `).bind(slug).first<ProjectRow>()
  if (!row) return null
  return publicProject(row as unknown as Record<string, unknown>)
}

export async function listAdminProjects(db: D1Database) {
  const result = await db.prepare(
    'SELECT * FROM projects ORDER BY featured DESC, sort_order ASC, name ASC',
  ).all<ProjectRow>()
  return result.results || []
}

export async function findProjectMetaBySlug(db: D1Database, slug: string) {
  return db.prepare('SELECT slug, is_private FROM projects WHERE slug = ?')
    .bind(slug)
    .first<{ slug: string; is_private: number }>()
}

export async function updateAdminProject(db: D1Database, slug: string, data: ProjectUpdate): Promise<void> {
  await db.prepare(`
    UPDATE projects SET
      name = COALESCE(?, name),
      summary = COALESCE(?, summary),
      description = ?,
      public_summary = ?,
      public_description = ?,
      public_name = ?,
      demo_url = ?,
      technologies = ?,
      featured = ?,
      published = ?,
      excluded = ?,
      sort_order = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE slug = ?
  `).bind(
    data.name ?? null,
    data.summary ?? null,
    data.description ?? null,
    data.publicSummary ?? null,
    data.publicDescription ?? null,
    data.publicName ?? null,
    data.demoUrl ?? null,
    JSON.stringify(data.technologies ?? []),
    data.featured ? 1 : 0,
    data.published ? 1 : 0,
    data.excluded ? 1 : 0,
    data.sortOrder,
    slug,
  ).run()
}
