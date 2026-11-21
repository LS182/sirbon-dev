import { GITHUB_ORG, type Env } from '../config/env'
import { completeSyncHistory, failSyncHistory, startSyncHistory } from '../database/syncHistory'
import { fetchGitHubRepositories } from './repositories'

function slugFromFullName(fullName: string): string {
  const prefixPattern = new RegExp(`^${GITHUB_ORG}/`, 'i')
  return fullName
    .replace(prefixPattern, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function synchronizeRepositories(db: D1Database, env: Env, githubLogin: string) {
  const syncId = crypto.randomUUID()
  await startSyncHistory(db, syncId, githubLogin)

  try {
    const repositories = await fetchGitHubRepositories(env)
    const statements = repositories.map((repo) =>
      db.prepare(`
        INSERT INTO projects (
          id, slug, name, summary, description, repository_url, demo_url,
          technologies, featured, published, excluded, repository_id, repository_full_name,
          is_private, default_branch, language, topics, synced_at, readme_cached
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
        ON CONFLICT(slug) DO UPDATE SET
          repository_id = excluded.repository_id,
          repository_full_name = excluded.repository_full_name,
          is_private = excluded.is_private,
          published = CASE WHEN excluded.is_private = 1 THEN 0 ELSE projects.published END,
          featured = CASE WHEN excluded.is_private = 1 THEN 0 ELSE projects.featured END,
          excluded = CASE WHEN excluded.is_private = 1 THEN 1 ELSE projects.excluded END,
          repository_url = CASE WHEN excluded.is_private = 1 THEN NULL ELSE COALESCE(excluded.repository_url, projects.repository_url) END,
          default_branch = excluded.default_branch,
          language = CASE WHEN excluded.is_private = 0 THEN excluded.language ELSE NULL END,
          topics = CASE WHEN excluded.is_private = 0 THEN excluded.topics ELSE '[]' END,
          readme_cached = CASE WHEN excluded.is_private = 0 THEN excluded.readme_cached ELSE NULL END,
          synced_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        crypto.randomUUID(),
        slugFromFullName(repo.fullName),
        repo.name,
        repo.private ? '' : (repo.description || ''),
        null,
        repo.private ? null : repo.htmlUrl,
        repo.private ? null : repo.homepage,
        JSON.stringify(repo.private ? [] : (repo.language ? [repo.language] : [])),
        repo.private ? 1 : 0,
        repo.id,
        repo.fullName,
        repo.private ? 1 : 0,
        repo.defaultBranch,
        repo.language,
        JSON.stringify(repo.topics),
        repo.private ? null : repo.readme,
      ),
    )

    if (statements.length) {
      await db.batch(statements)
    }

    const publicCount = repositories.filter((repo) => !repo.private).length
    const privateCount = repositories.length - publicCount
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
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Repository synchronization failed'
    await failSyncHistory(db, syncId, message)
    throw error
  }
}
