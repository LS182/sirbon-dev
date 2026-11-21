import type { Env } from '../config/env'
import { completeSyncHistory, failSyncHistory, getLatestSync, startSyncHistory } from '../database/syncHistory'
import type { ProjectRow, SyncHistoryRow } from '../database/types'
import { fetchGitHubRepositories, type SyncedGitHubRepository } from './repositories'

const D1_BATCH_CHUNK_SIZE = 40
const AUTO_SYNC_TTL_MS = 15 * 60 * 1000

export interface SyncSummary {
  success: boolean
  repositoryCount: number
  publicCount: number
  privateCount: number
  createdCount: number
  updatedCount: number
  removedCount: number
  archivedCount: number
}

function slugFromRepository(repo: SyncedGitHubRepository): string {
  const repoSegment = repo.fullName.includes('/') ? repo.fullName.split('/').slice(1).join('-') : repo.name
  const cleaned = repoSegment
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return cleaned || `repo-${repo.id}`
}

function derivePublicTechnologies(repo: SyncedGitHubRepository): string[] {
  if (repo.private) return []
  const items: string[] = []
  if (repo.language) items.push(repo.language)
  for (const topic of repo.topics) {
    if (topic && !items.some((existing) => existing.toLowerCase() === topic.toLowerCase())) {
      items.push(topic)
    }
  }
  return items.slice(0, 12)
}

function hasApprovedPublicFields(row: ProjectRow): boolean {
  return Boolean(
    typeof row.public_name === 'string' && row.public_name.trim()
    && typeof row.public_summary === 'string' && row.public_summary.trim()
    && typeof row.public_description === 'string' && row.public_description.trim(),
  )
}

function isEmptyJsonArray(value: string | null | undefined): boolean {
  if (!value || !value.trim()) return true
  try {
    const parsed = JSON.parse(value)
    return !Array.isArray(parsed) || parsed.length === 0
  } catch {
    return true
  }
}

async function runChunkedBatch(db: D1Database, statements: D1PreparedStatement[]): Promise<void> {
  for (let i = 0; i < statements.length; i += D1_BATCH_CHUNK_SIZE) {
    const chunk = statements.slice(i, i + D1_BATCH_CHUNK_SIZE)
    if (chunk.length > 0) {
      await db.batch(chunk)
    }
  }
}

export async function synchronizeRepositories(
  db: D1Database,
  env: Env,
  githubLogin: string,
): Promise<SyncSummary> {
  const syncId = crypto.randomUUID()
  await startSyncHistory(db, syncId, githubLogin)

  try {
    const existingResult = await db.prepare('SELECT * FROM projects').all<ProjectRow>()
    const existingRows = existingResult.results || []

    const byRepositoryId = new Map<string, ProjectRow>()
    const bySlug = new Map<string, ProjectRow>()
    const usedSlugs = new Set<string>()
    const skipReadmeRepoIds = new Set<string>()

    for (const row of existingRows) {
      usedSlugs.add(row.slug)
      bySlug.set(row.slug, row)
      if (row.repository_id) {
        byRepositoryId.set(String(row.repository_id), row)
        if (!row.is_private && row.readme_cached) {
          skipReadmeRepoIds.add(String(row.repository_id))
        }
      }
    }

    const repositories = await fetchGitHubRepositories(env, {
      skipReadmeRepoIds,
      fallbackOwnerLogin: githubLogin,
    })

    const statements: D1PreparedStatement[] = []
    const discoveredRepoIds = new Set<string>()
    let createdCount = 0
    let updatedCount = 0

    for (const repo of repositories) {
      discoveredRepoIds.add(repo.id)
      const desiredSlug = slugFromRepository(repo)
      const matched = byRepositoryId.get(repo.id) || bySlug.get(desiredSlug)

      const derivedTechs = derivePublicTechnologies(repo)

      if (matched) {
        updatedCount++
        const wasPublic = matched.is_private === 0 || matched.is_private === false
        const transitionedToPrivate = wasPublic && repo.private
        const keepPrivatePublished = repo.private && !transitionedToPrivate && hasApprovedPublicFields(matched)

        const nextPublished = repo.private
          ? (keepPrivatePublished ? (matched.published ? 1 : 0) : 0)
          : (matched.published ? 1 : 0)
        const nextFeatured = repo.private
          ? (keepPrivatePublished ? (matched.featured ? 1 : 0) : 0)
          : (matched.featured ? 1 : 0)
        const nextExcluded = repo.private
          ? (keepPrivatePublished ? (matched.excluded ? 1 : 0) : 1)
          : (matched.excluded ? 1 : 0)

        // Update slug cleanly on rename if the new slug isn't taken by another row.
        let nextSlug = matched.slug
        if (desiredSlug !== matched.slug && !usedSlugs.has(desiredSlug)) {
          usedSlugs.delete(matched.slug)
          usedSlugs.add(desiredSlug)
          nextSlug = desiredSlug
        }

        const nextSummary = repo.private
          ? ''
          : (matched.summary?.trim() ? matched.summary : (repo.description || ''))
        const nextDescription = repo.private ? null : (matched.description ?? null)
        const nextRepoUrl = repo.private ? null : (repo.htmlUrl || matched.repository_url)
        const nextDemoUrl = repo.private ? null : (matched.demo_url || repo.homepage)
        const nextTechnologies = repo.private
          ? '[]'
          : (isEmptyJsonArray(matched.technologies) ? JSON.stringify(derivedTechs) : matched.technologies)
        const nextReadme = repo.private ? null : (repo.readme ?? matched.readme_cached)

        statements.push(
          db.prepare(`
            UPDATE projects SET
              slug = ?,
              name = ?,
              summary = ?,
              description = ?,
              repository_url = ?,
              demo_url = ?,
              technologies = ?,
              featured = ?,
              published = ?,
              excluded = ?,
              repository_id = ?,
              repository_full_name = ?,
              is_private = ?,
              default_branch = ?,
              language = ?,
              topics = ?,
              readme_cached = ?,
              synced_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(
            nextSlug,
            repo.name,
            nextSummary,
            nextDescription,
            nextRepoUrl,
            nextDemoUrl,
            nextTechnologies,
            nextFeatured,
            nextPublished,
            nextExcluded,
            repo.id,
            repo.fullName,
            repo.private ? 1 : 0,
            repo.defaultBranch,
            repo.private ? null : repo.language,
            JSON.stringify(repo.private ? [] : repo.topics),
            nextReadme,
            matched.id,
          ),
        )
      } else {
        createdCount++
        let uniqueSlug = desiredSlug
        if (usedSlugs.has(uniqueSlug)) {
          uniqueSlug = `${desiredSlug}-${repo.id.slice(-6)}`
        }
        usedSlugs.add(uniqueSlug)

        // Newly discovered repositories are NEVER auto-published.
        // Private and archived repositories default to excluded=1 until explicitly curated.
        const initialExcluded = (repo.private || repo.archived) ? 1 : 0

        statements.push(
          db.prepare(`
            INSERT INTO projects (
              id, slug, name, summary, description, repository_url, demo_url,
              technologies, featured, published, excluded, repository_id, repository_full_name,
              is_private, default_branch, language, topics, synced_at, readme_cached
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
          `).bind(
            crypto.randomUUID(),
            uniqueSlug,
            repo.name,
            repo.private ? '' : (repo.description || ''),
            null,
            repo.private ? null : repo.htmlUrl,
            repo.private ? null : repo.homepage,
            JSON.stringify(derivedTechs),
            initialExcluded,
            repo.id,
            repo.fullName,
            repo.private ? 1 : 0,
            repo.defaultBranch,
            repo.private ? null : repo.language,
            JSON.stringify(repo.private ? [] : repo.topics),
            repo.private ? null : repo.readme,
          ),
        )
      }
    }

    // Handle repositories that were previously synced but deleted or removed from the GitHub App installation.
    let removedCount = 0
    for (const row of existingRows) {
      if (row.repository_id && !discoveredRepoIds.has(String(row.repository_id))) {
        removedCount++
        statements.push(
          db.prepare(`
            UPDATE projects SET
              published = 0,
              featured = 0,
              excluded = 1,
              readme_cached = NULL,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(row.id),
        )
      }
    }

    await runChunkedBatch(db, statements)

    const publicCount = repositories.filter((repo) => !repo.private).length
    const privateCount = repositories.length - publicCount
    const archivedCount = repositories.filter((repo) => repo.archived).length

    await completeSyncHistory(db, syncId, {
      total: repositories.length,
      publicCount,
      privateCount,
    })

    return {
      success: true,
      repositoryCount: repositories.length,
      publicCount,
      privateCount,
      createdCount,
      updatedCount,
      removedCount,
      archivedCount,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Repository synchronization failed'
    await failSyncHistory(db, syncId, message)
    throw error
  }
}

function isSyncStale(lastSync: SyncHistoryRow | null, maxAgeMs: number): boolean {
  if (!lastSync || lastSync.status !== 'success') return true
  const rawTimestamp = lastSync.completed_at || lastSync.started_at
  if (!rawTimestamp) return true
  const normalized = /\dT/.test(rawTimestamp) ? rawTimestamp : rawTimestamp.replace(' ', 'T') + 'Z'
  const syncedAt = new Date(normalized).getTime()
  if (!Number.isFinite(syncedAt)) return true
  return Date.now() - syncedAt > maxAgeMs
}

export async function ensureRepositoriesFresh(
  db: D1Database,
  env: Env,
  githubLogin: string,
  maxAgeMs = AUTO_SYNC_TTL_MS,
): Promise<{
  autoSynced: boolean
  syncSummary: SyncSummary | null
  syncWarning: string | null
  lastSync: SyncHistoryRow | null
}> {
  const latest = await getLatestSync(db)
  if (!isSyncStale(latest, maxAgeMs)) {
    return { autoSynced: false, syncSummary: null, syncWarning: null, lastSync: latest }
  }

  try {
    const syncSummary = await synchronizeRepositories(db, env, githubLogin)
    const updatedLatest = await getLatestSync(db)
    return { autoSynced: true, syncSummary, syncWarning: null, lastSync: updatedLatest }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Automatic repository synchronization failed'
    const updatedLatest = await getLatestSync(db)
    return { autoSynced: false, syncSummary: null, syncWarning: message, lastSync: updatedLatest }
  }
}
