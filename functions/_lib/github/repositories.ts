import { GITHUB_ORG, type Env } from '../config/env'
import { requestGitHubInstallationToken } from './app'

export interface SyncedGitHubRepository {
  id: string
  name: string
  fullName: string
  description: string | null
  htmlUrl: string | null
  homepage: string | null
  defaultBranch: string | null
  language: string | null
  topics: string[]
  private: boolean
  archived: boolean
  disabled: boolean
  fork: boolean
  updatedAt: string | null
  readme: string | null
}

function decodeBase64Utf8(encoded: string): string {
  const binary = atob(encoded.replace(/\s+/g, ''))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

async function fetchInstallationPages(token: string): Promise<Array<Record<string, unknown>>> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'sirbon-dev',
  }
  const repositories: Array<Record<string, unknown>> = []
  for (let page = 1; page <= 10; page++) {
    const response = await fetch(
      `https://api.github.com/installation/repositories?per_page=100&page=${page}`,
      { headers },
    )
    if (response.status === 401) {
      throw new Error('INSTALLATION_TOKEN_EXPIRED')
    }
    if (response.status === 403 || response.status === 429) {
      throw new Error(`GitHub API rate limit or access denied (${response.status})`)
    }
    if (!response.ok) {
      throw new Error(`GitHub installation request failed (${response.status})`)
    }
    const result = await response.json() as {
      repositories?: Array<Record<string, unknown>>
      total_count?: number
    }
    repositories.push(...(result.repositories || []))
    if (!result.repositories?.length || repositories.length >= (result.total_count || 0)) break
  }
  return repositories
}

async function fetchPublicAccountPages(): Promise<Array<Record<string, unknown>>> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'sirbon-dev',
  }
  const repositories: Array<Record<string, unknown>> = []
  let endpointKind: 'users' | 'orgs' = 'users'

  for (let page = 1; page <= 10; page++) {
    let response = await fetch(
      `https://api.github.com/${endpointKind}/${GITHUB_ORG}/repos?per_page=100&type=owner&page=${page}`,
      { headers },
    )
    if (page === 1 && response.status === 404 && endpointKind === 'users') {
      endpointKind = 'orgs'
      response = await fetch(
        `https://api.github.com/orgs/${GITHUB_ORG}/repos?per_page=100&type=all&page=${page}`,
        { headers },
      )
    }
    if (response.status === 403 || response.status === 429) {
      throw new Error(`GitHub API rate limit or access denied (${response.status})`)
    }
    if (!response.ok) {
      throw new Error(`GitHub public repository request failed (${response.status})`)
    }
    const result = await response.json() as Array<Record<string, unknown>>
    repositories.push(...result)
    if (result.length < 100) break
  }
  return repositories
}

export async function fetchGitHubRepositories(env: Env): Promise<SyncedGitHubRepository[]> {
  let installationToken = await requestGitHubInstallationToken(env)
  let repositories: Array<Record<string, unknown>>

  if (installationToken) {
    try {
      repositories = await fetchInstallationPages(installationToken.token)
    } catch (error) {
      if (error instanceof Error && error.message === 'INSTALLATION_TOKEN_EXPIRED') {
        installationToken = await requestGitHubInstallationToken(env)
        if (!installationToken) {
          throw new Error('GitHub installation token refresh failed')
        }
        repositories = await fetchInstallationPages(installationToken.token)
      } else {
        throw error
      }
    }
  } else {
    repositories = await fetchPublicAccountPages()
  }

  const readmeHeaders: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'sirbon-dev',
  }
  if (installationToken) {
    readmeHeaders.Authorization = `Bearer ${installationToken.token}`
  }

  const orgPrefix = `${GITHUB_ORG.toLowerCase()}/`
  const parsed: SyncedGitHubRepository[] = []

  for (const repository of repositories) {
    const fullName = String(repository.full_name || '')
    if (!fullName.toLowerCase().startsWith(orgPrefix)) continue

    const isPrivate = Boolean(repository.private)
    let readme: string | null = null

    // Public repositories only: never fetch or cache READMEs for private repositories.
    if (!isPrivate) {
      try {
        const readmeResponse = await fetch(`https://api.github.com/repos/${fullName}/readme`, {
          headers: readmeHeaders,
        })
        if (readmeResponse.ok) {
          const readmeResult = await readmeResponse.json() as { content?: string; encoding?: string }
          if (readmeResult.encoding === 'base64' && typeof readmeResult.content === 'string') {
            readme = decodeBase64Utf8(readmeResult.content).slice(0, 200000)
          }
        }
      } catch {
        readme = null
      }
    }

    parsed.push({
      id: String(repository.id),
      name: String(repository.name || ''),
      fullName,
      description: isPrivate ? null : (typeof repository.description === 'string' ? repository.description : null),
      htmlUrl: isPrivate ? null : (typeof repository.html_url === 'string' ? repository.html_url : null),
      homepage: isPrivate ? null : (typeof repository.homepage === 'string' ? repository.homepage : null),
      defaultBranch: typeof repository.default_branch === 'string' ? repository.default_branch : null,
      language: isPrivate ? null : (typeof repository.language === 'string' ? repository.language : null),
      topics: isPrivate
        ? []
        : (Array.isArray(repository.topics) ? repository.topics.filter((item): item is string => typeof item === 'string') : []),
      private: isPrivate,
      archived: Boolean(repository.archived),
      disabled: Boolean(repository.disabled),
      fork: Boolean(repository.fork),
      updatedAt: typeof repository.updated_at === 'string' ? repository.updated_at : null,
      readme,
    })
  }

  return parsed
}
