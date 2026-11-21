import { generateKeyPairSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { isPublicProjectVisible, publicProject } from '../functions/_lib/database/projects'
import type { ProjectRow, SyncHistoryRow } from '../functions/_lib/database/types'
import { createGitHubAppJwt } from '../functions/_lib/github/app'
import { fetchGitHubRepositories, parseNextLinkUrl } from '../functions/_lib/github/repositories'
import { ensureRepositoriesFresh, synchronizeRepositories } from '../functions/_lib/github/sync'

describe('GitHub App JWT, repository pagination, synchronization and private isolation', () => {
  it('signs valid RS256 GitHub App JWTs from both PKCS#1 (GitHub native) and PKCS#8 PEM keys', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const pkcs1Pem = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString()
    const pkcs8Pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    const escapedPkcs1 = pkcs1Pem.replace(/\n/g, '\\n')

    const jwtFromPkcs1 = await createGitHubAppJwt('Iv23testclient', escapedPkcs1, 1700000000)
    const jwtFromPkcs8 = await createGitHubAppJwt('Iv23testclient', pkcs8Pem, 1700000000)

    expect(jwtFromPkcs1.split('.')).toHaveLength(3)
    expect(jwtFromPkcs8.split('.')).toHaveLength(3)
    const payload = JSON.parse(atob(jwtFromPkcs1.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    expect(payload).toEqual({ iat: 1699999940, exp: 1700000540, iss: 'Iv23testclient' })
  })

  it('parses RFC 5988 GitHub pagination Link headers cleanly', () => {
    expect(
      parseNextLinkUrl('<https://api.github.com/installation/repositories?per_page=100&page=2>; rel="next", <https://api.github.com/installation/repositories?per_page=100&page=4>; rel="last"'),
    ).toBe('https://api.github.com/installation/repositories?per_page=100&page=2')
    expect(parseNextLinkUrl('<https://api.github.com/installation/repositories?page=1>; rel="prev"')).toBeNull()
    expect(parseNextLinkUrl(null)).toBeNull()
  })

  it('redacts private repository metadata from public project shape and fails closed', () => {
    const publicResult = publicProject({
      id: '1',
      slug: 'private-case',
      name: 'Private case',
      summary: 'Internal summary',
      description: 'Internal description',
      repository_url: 'https://github.com/LS182/private',
      demo_url: 'https://internal.example.com',
      technologies: '["TypeScript"]',
      featured: 0,
      published: 1,
      is_private: 1,
      public_summary: 'Manually approved public summary',
      public_description: 'Manually approved public description',
      public_name: 'Approved public name',
    })
    expect(publicResult.repositoryUrl).toBeUndefined()
    expect(publicResult.demoUrl).toBeUndefined()
    expect(publicResult.name).toBe('Approved public name')
    expect(publicResult.summary).toBe('Manually approved public summary')
    expect(publicResult.description).toBe('Manually approved public description')
  })

  it('hides unpublished, excluded, and incompletely authored private projects', () => {
    expect(isPublicProjectVisible({
      published: 1,
      excluded: 0,
      is_private: 1,
      public_name: 'Public name',
      public_summary: 'Summary',
      public_description: 'Description',
    })).toBe(true)
    expect(isPublicProjectVisible({
      published: 0,
      excluded: 0,
      is_private: 1,
      public_name: 'Public name',
      public_summary: 'Summary',
      public_description: 'Description',
    })).toBe(false)
    expect(isPublicProjectVisible({ published: 1, excluded: 1, is_private: 0 })).toBe(false)
    expect(isPublicProjectVisible({
      published: 1,
      excluded: 0,
      is_private: 1,
      public_summary: '',
      public_description: 'Description',
    })).toBe(false)
  })

  it('paginates across multiple GitHub App installation pages and preserves private repo isolation', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const pkcs1Pem = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString()

    const originalFetch = globalThis.fetch
    let tokenRequests = 0
    let page1Called = false
    let page2Called = false
    let privateReadmeAttempted = false

    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('/app/installations/184466368/access_tokens')) {
        tokenRequests++
        return new Response(JSON.stringify({ token: `ghs_token_${tokenRequests}` }), { status: 201 })
      }
      if (url.includes('/installation/repositories') && new URL(url).searchParams.get('page') === '1') {
        page1Called = true
        return new Response(
          JSON.stringify({
            total_count: 2,
            repositories: [
              {
                id: 101,
                name: 'public-portfolio',
                full_name: 'LS182/public-portfolio',
                private: false,
                description: 'Portfolio app',
                html_url: 'https://github.com/LS182/public-portfolio',
                homepage: 'https://sirbon.dev',
                language: 'TypeScript',
                topics: ['react', 'cloudflare'],
                default_branch: 'main',
              },
            ],
          }),
          {
            status: 200,
            headers: {
              Link: '<https://api.github.com/installation/repositories?per_page=100&page=2>; rel="next"',
            },
          },
        )
      }
      if (url.includes('/installation/repositories') && new URL(url).searchParams.get('page') === '2') {
        page2Called = true
        return new Response(
          JSON.stringify({
            total_count: 2,
            repositories: [
              {
                id: 202,
                name: 'private-client-tool',
                full_name: 'other-org/private-client-tool',
                private: true,
                description: 'Confidential repo description',
                html_url: 'https://github.com/other-org/private-client-tool',
                homepage: 'https://internal.example.com',
                language: 'Python',
                topics: ['internal'],
                default_branch: 'main',
              },
            ],
          }),
          { status: 200 },
        )
      }
      if (url.includes('/repos/LS182/public-portfolio/readme')) {
        return new Response(
          JSON.stringify({
            encoding: 'base64',
            content: Buffer.from('# Sirbon.dev — Café', 'utf8').toString('base64'),
          }),
          { status: 200 },
        )
      }
      if (url.includes('/private-client-tool/readme')) {
        privateReadmeAttempted = true
      }
      return new Response('{}', { status: 404 })
    }) as typeof fetch

    try {
      const repositories = await fetchGitHubRepositories({
        GITHUB_APP_CLIENT_ID: 'Iv23testclient',
        GITHUB_APP_INSTALLATION_ID: '184466368',
        GITHUB_APP_PRIVATE_KEY: pkcs1Pem,
      })

      expect(tokenRequests).toBe(1)
      expect(page1Called).toBe(true)
      expect(page2Called).toBe(true)
      expect(privateReadmeAttempted).toBe(false)
      expect(repositories).toHaveLength(2)

      expect(repositories[0].fullName).toBe('LS182/public-portfolio')
      expect(repositories[0].readme).toBe('# Sirbon.dev — Café')

      expect(repositories[1].fullName).toBe('other-org/private-client-tool')
      expect(repositories[1].private).toBe(true)
      expect(repositories[1].htmlUrl).toBeNull()
      expect(repositories[1].homepage).toBeNull()
      expect(repositories[1].description).toBeNull()
      expect(repositories[1].language).toBeNull()
      expect(repositories[1].topics).toEqual([])
      expect(repositories[1].readme).toBeNull()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('deduplicates renamed repos by repository_id, hides deleted repos, and unpublishes newly private repos', async () => {
    const executedStatements: Array<{ sql: string; values: unknown[] }> = []
    const existingRows: Partial<ProjectRow>[] = [
      {
        id: 'row-renamed',
        slug: 'old-repo-name',
        name: 'old-repo-name',
        summary: 'Existing summary',
        description: null,
        repository_url: 'https://github.com/LS182/old-repo-name',
        demo_url: null,
        technologies: '["TypeScript"]',
        featured: 1,
        published: 1,
        excluded: 0,
        is_private: 0,
        repository_id: '1001',
        repository_full_name: 'LS182/old-repo-name',
        readme_cached: '# Old',
      },
      {
        id: 'row-now-private',
        slug: 'was-public',
        name: 'was-public',
        summary: 'Public summary',
        description: null,
        repository_url: 'https://github.com/LS182/was-public',
        demo_url: 'https://demo.example.com',
        technologies: '["Java"]',
        featured: 1,
        published: 1,
        excluded: 0,
        is_private: 0,
        repository_id: '1002',
        repository_full_name: 'LS182/was-public',
        readme_cached: '# Secret',
      },
      {
        id: 'row-deleted',
        slug: 'deleted-repo',
        name: 'deleted-repo',
        summary: 'Deleted',
        description: null,
        repository_url: 'https://github.com/LS182/deleted-repo',
        demo_url: null,
        technologies: '[]',
        featured: 0,
        published: 1,
        excluded: 0,
        is_private: 0,
        repository_id: '1003',
        repository_full_name: 'LS182/deleted-repo',
        readme_cached: '# Gone',
      },
    ]

    const db = {
      prepare: (sql: string) => ({
        bind: (...values: unknown[]) => ({
          sql,
          values,
          run: async () => ({ success: true }),
          first: async () => null,
          all: async () => ({ results: [], success: true }),
        }),
        all: async () => ({
          results: sql.includes('SELECT * FROM projects') ? existingRows : [],
          success: true,
        }),
        first: async () => null,
        run: async () => ({ success: true }),
      }),
      batch: async (stmts: Array<{ sql?: string; values?: unknown[] }>) => {
        for (const s of stmts) {
          executedStatements.push({ sql: s.sql || '', values: s.values || [] })
        }
        return stmts.map(() => ({ success: true }))
      },
    } as unknown as D1Database

    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('/users/LS182/repos')) {
        return new Response(
          JSON.stringify([
            {
              id: 1001,
              name: 'new-repo-name',
              full_name: 'LS182/new-repo-name',
              private: false,
              description: 'Updated',
              html_url: 'https://github.com/LS182/new-repo-name',
              language: 'TypeScript',
              topics: [],
              default_branch: 'main',
            },
            {
              id: 1002,
              name: 'was-public',
              full_name: 'LS182/was-public',
              private: true,
              description: 'Now private',
              html_url: 'https://github.com/LS182/was-public',
              language: 'Java',
              topics: [],
              default_branch: 'main',
            },
            {
              id: 1004,
              name: 'brand-new-public',
              full_name: 'LS182/brand-new-public',
              private: false,
              description: 'Fresh repo',
              html_url: 'https://github.com/LS182/brand-new-public',
              language: 'Python',
              topics: ['cli'],
              default_branch: 'main',
            },
          ]),
          { status: 200 },
        )
      }
      return new Response('{}', { status: 404 })
    }) as typeof fetch

    try {
      const summary = await synchronizeRepositories(db, {}, 'LS182')
      expect(summary.repositoryCount).toBe(3)
      expect(summary.createdCount).toBe(1)
      expect(summary.updatedCount).toBe(2)
      expect(summary.removedCount).toBe(1)

      // Renamed repo updated in place (no duplicate INSERT)
      const renamedUpdate = executedStatements.find((s) => s.sql.includes('UPDATE projects') && s.values.at(-1) === 'row-renamed')
      expect(renamedUpdate?.values[0]).toBe('new-repo-name')
      expect(renamedUpdate?.values[1]).toBe('new-repo-name')

      // Public -> Private transition forced published=0, featured=0, excluded=1 and wiped private metadata
      const privatizedUpdate = executedStatements.find((s) => s.sql.includes('UPDATE projects') && s.values.at(-1) === 'row-now-private')
      expect(privatizedUpdate?.values[2]).toBe('') // summary wiped
      expect(privatizedUpdate?.values[4]).toBeNull() // repository_url wiped
      expect(privatizedUpdate?.values[7]).toBe(0) // featured=0
      expect(privatizedUpdate?.values[8]).toBe(0) // published=0
      expect(privatizedUpdate?.values[9]).toBe(1) // excluded=1
      expect(privatizedUpdate?.values[16]).toBeNull() // readme_cached wiped

      // Deleted/revoked repo hidden
      const deletedUpdate = executedStatements.find((s) => s.sql.includes('published = 0') && s.values[0] === 'row-deleted')
      expect(deletedUpdate).toBeDefined()

      // Brand-new repo inserted unpublished (published=0)
      const inserted = executedStatements.find((s) => s.sql.includes('INSERT INTO projects'))
      expect(inserted?.values[1]).toBe('brand-new-public')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('auto-syncs when sync history is empty and surfaces errors cleanly without fabricating data', async () => {
    const emptySyncDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true }),
          first: async () => null,
        }),
        all: async () => ({ results: [], success: true }),
        first: async () => null,
        run: async () => ({ success: true }),
      }),
      batch: async () => [],
    } as unknown as D1Database

    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () => new Response(JSON.stringify({ message: 'API rate limit exceeded' }), {
      status: 403,
      headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1800000000' },
    })) as typeof fetch

    try {
      const result = await ensureRepositoriesFresh(emptySyncDb, {}, 'LS182')
      expect(result.autoSynced).toBe(false)
      expect(result.syncSummary).toBeNull()
      expect(result.syncWarning).toContain('rate limit')
    } finally {
      globalThis.fetch = originalFetch
    }

    // Skips auto-sync when latest sync is fresh
    const freshSync: SyncHistoryRow = {
      id: 'sync-1',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      status: 'success',
      repository_count: 3,
      public_count: 2,
      private_count: 1,
      error_message: null,
      initiated_by: 'LS182',
    }
    const freshDb = {
      prepare: () => ({
        first: async () => freshSync,
      }),
    } as unknown as D1Database

    const freshResult = await ensureRepositoriesFresh(freshDb, {}, 'LS182')
    expect(freshResult.autoSynced).toBe(false)
    expect(freshResult.syncWarning).toBeNull()
    expect(freshResult.lastSync?.id).toBe('sync-1')
  })
})
