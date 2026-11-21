import { GITHUB_ORG, type Env } from '../config/env'
import { requestGitHubInstallationToken } from './app'

const GITHUB_API_VERSION = '2022-11-28'
const MAX_PAGES = 50
const DEFAULT_MAX_README_FETCHES = 15

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

export interface FetchRepositoriesOptions {
  /** Skip re-fetching READMEs for public repository IDs already cached and unchanged. */
  skipReadmeRepoIds?: Set<string>
  /** Cap README subrequests to stay safely within Cloudflare Workers subrequest limits. */
  maxReadmeFetches?: number
  /** Optional GitHub username override for unauthenticated personal account fallback. */
  fallbackOwnerLogin?: string
}

function decodeBase64Utf8(encoded: string): string {
  const binary = atob(encoded.replace(/\s+/g, ''))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function parseNextLinkUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null
  for (const part of linkHeader.split(',')) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="next"/i)
    if (match?.[1]) return match[1]
  }
  return null
}

function buildRateLimitError(response: Response): Error {
  const remaining = response.headers.get('x-ratelimit-remaining')
  const resetHeader = response.headers.get('x-ratelimit-reset')
  if (remaining === '0' && resetHeader) {
    const resetMs = Number(resetHeader) * 1000
    if (Number.isFinite(resetMs)) {
      return new Error(`GitHub API rate limit exceeded (${response.status}); resets at ${new Date(resetMs).toISOString()}`)
    }
  }
  return new Error(`GitHub API rate limit or access denied (${response.status})`)
}

async function fetchInstallationPages(token: string): Promise<Array<Record<string, unknown>>> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'sirbon-dev',
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
  }

  const repositories: Array<Record<string, unknown>> = []
  let nextUrl: string | null = 'https://api.github.com/installation/repositories?per_page=100&page=1'

  for (let page = 1; page <= MAX_PAGES && nextUrl; page++) {
    const response = await fetch(nextUrl, { headers })
    if (response.status === 401) {
      throw new Error('INSTALLATION_TOKEN_EXPIRED')
    }
    if (response.status === 403 || response.status === 429) {
      throw buildRateLimitError(response)
    }
    if (!response.ok) {
      throw new Error(`GitHub installation request failed (${response.status})`)
    }

    const result = await response.json() as {
      repositories?: Array<Record<string, unknown>>
      total_count?: number
    }
    const batch = result.repositories || []
    repositories.push(...batch)

    const linkNext = parseNextLinkUrl(response.headers.get('Link'))
    if (linkNext) {
      nextUrl = linkNext
    } else if (batch.length === 100 && (!result.total_count || repositories.length < result.total_count)) {
      nextUrl = `https://api.github.com/installation/repositories?per_page=100&page=${page + 1}`
    } else {
      nextUrl = null
    }
  }

  return repositories
}

async function fetchPublicAccountPages(ownerLogin: string): Promise<Array<Record<string, unknown>>> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'sirbon-dev',
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
  }

  const cleanOwner = encodeURIComponent(ownerLogin.trim() || GITHUB_ORG)
  const repositories: Array<Record<string, unknown>> = []
  let endpointKind: 'users' | 'orgs' = 'users'
  let nextUrl: string | null = `https://api.github.com/users/${cleanOwner}/repos?per_page=100&type=owner&page=1`

  for (let page = 1; page <= MAX_PAGES && nextUrl; page++) {
    let response = await fetch(nextUrl, { headers })
    if (page === 1 && response.status === 404 && endpointKind === 'users') {
      endpointKind = 'orgs'
      response = await fetch(
        `https://api.github.com/orgs/${cleanOwner}/repos?per_page=100&type=all&page=1`,
        { headers },
      )
    }
    if (response.status === 403 || response.status === 429) {
      throw buildRateLimitError(response)
    }
    if (!response.ok) {
      throw new Error(`GitHub public repository request failed (${response.status})`)
    }

    const batch = await response.json() as Array<Record<string, unknown>>
    repositories.push(...batch)

    const linkNext = parseNextLinkUrl(response.headers.get('Link'))
    if (linkNext) {
      nextUrl = linkNext
    } else if (batch.length === 100) {
      const typeParam = endpointKind === 'users' ? 'owner' : 'all'
      nextUrl = `https://api.github.com/${endpointKind}/${cleanOwner}/repos?per_page=100&type=${typeParam}&page=${page + 1}`
    } else {
      nextUrl = null
    }
  }

  return repositories
}

async function fetchPublicReadme(fullName: string, headers: Record<string, string>): Promise<string | null> {
  try {
    const readmeResponse = await fetch(`https://api.github.com/repos/${fullName}/readme`, { headers })
    if (!readmeResponse.ok) return null
    const readmeResult = await readmeResponse.json() as { content?: string; encoding?: string }
    if (readmeResult.encoding === 'base64' && typeof readmeResult.content === 'string') {
      return decodeBase64Utf8(readmeResult.content).slice(0, 200000)
    }
    return null
  } catch {
    return null
  }
}

export async function fetchGitHubRepositories(
  env: Env,
  options: FetchRepositoriesOptions = {},
): Promise<SyncedGitHubRepository[]> {
  let installationToken = await requestGitHubInstallationToken(env)
  let rawRepositories: Array<Record<string, unknown>>
  const usedInstallation = Boolean(installationToken)

  if (installationToken) {
    try {
      rawRepositories = await fetchInstallationPages(installationToken.token)
    } catch (error) {
      if (error instanceof Error && error.message === 'INSTALLATION_TOKEN_EXPIRED') {
        installationToken = await requestGitHubInstallationToken(env)
        if (!installationToken) {
          throw new Error('GitHub installation token refresh failed')
        }
        rawRepositories = await fetchInstallationPages(installationToken.token)
      } else {
        throw error
      }
    }
  } else {
    rawRepositories = await fetchPublicAccountPages(options.fallbackOwnerLogin || GITHUB_ORG)
  }

  // Deduplicate by immutable repository id in case pagination overlaps during live writes.
  const seenIds = new Set<string>()
  const uniqueRaw: Array<Record<string, unknown>> = []
  const expectedPrefix = `${(options.fallbackOwnerLogin || GITHUB_ORG).toLowerCase()}/`

  for (const repository of rawRepositories) {
    const repoId = String(repository.id || '')
    const fullName = String(repository.full_name || '')
    if (!repoId || !fullName || seenIds.has(repoId)) continue
    // When using the GitHub App installation, accept every repository explicitly granted to the installation.
    // When using unauthenticated public fallback, restrict to the target account.
    if (!usedInstallation && !fullName.toLowerCase().startsWith(expectedPrefix)) continue
    seenIds.add(repoId)
    uniqueRaw.push(repository)
  }

  const readmeHeaders: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'sirbon-dev',
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
  }
  if (installationToken) {
    readmeHeaders.Authorization = `Bearer ${installationToken.token}`
  }

  const maxReadmeFetches = options.maxReadmeFetches ?? DEFAULT_MAX_README_FETCHES
  const skipSet = options.skipReadmeRepoIds ?? new Set<string>()

  // Public repositories only: never fetch or cache READMEs for private repositories.
  const readmeTargets = uniqueRaw
    .filter((repo) => !repo.private && !skipSet.has(String(repo.id)))
    .slice(0, maxReadmeFetches)

  const readmeById = new Map<string, string | null>()
  for (let i = 0; i < readmeTargets.length; i += 5) {
    const chunk = readmeTargets.slice(i, i + 5)
    const results = await Promise.all(
      chunk.map(async (repo) => {
        const id = String(repo.id)
        const fullName = String(repo.full_name)
        const content = await fetchPublicReadme(fullName, readmeHeaders)
        return [id, content] as const
      }),
    )
    for (const [id, content] of results) {
      readmeById.set(id, content)
    }
  }

  return uniqueRaw.map((repository) => {
    const id = String(repository.id)
    const fullName = String(repository.full_name || '')
    const isPrivate = Boolean(repository.private)

    return {
      id,
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
      readme: isPrivate ? null : (readmeById.get(id) ?? null),
    }
  })
}
