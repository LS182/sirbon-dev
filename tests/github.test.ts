import { generateKeyPairSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { isPublicProjectVisible, publicProject } from '../functions/_lib/database/projects'
import { createGitHubAppJwt } from '../functions/_lib/github/app'
import { fetchGitHubRepositories } from '../functions/_lib/github/repositories'

describe('GitHub App JWT, repository sync and private metadata isolation', () => {
  it('signs valid RS256 GitHub App JWTs from both PKCS#1 (GitHub native) and PKCS#8 PEM keys', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const pkcs1Pem = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString()
    const pkcs8Pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    const escapedPkcs1 = pkcs1Pem.replace(/\n/g, '\\n')

    const jwtFromPkcs1 = await createGitHubAppJwt('Iv1.testclient', escapedPkcs1, 1700000000)
    const jwtFromPkcs8 = await createGitHubAppJwt('Iv1.testclient', pkcs8Pem, 1700000000)

    expect(jwtFromPkcs1.split('.')).toHaveLength(3)
    expect(jwtFromPkcs8.split('.')).toHaveLength(3)
    const payload = JSON.parse(atob(jwtFromPkcs1.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    expect(payload).toEqual({ iat: 1699999940, exp: 1700000540, iss: 'Iv1.testclient' })
  })

  it('redacts private repository metadata from public project shape', () => {
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

  it('paginates public GitHub repositories, decodes UTF-8 READMEs, and never exposes private fields', async () => {
    const originalFetch = globalThis.fetch
    let callCount = 0
    globalThis.fetch = (async (input: string | URL | Request) => {
      callCount++
      const url = String(input)
      if (url.includes('/orgs/LS182/repos')) {
        return new Response(JSON.stringify(callCount === 1 ? [
          {
            id: 1,
            name: 'public-one',
            full_name: 'LS182/public-one',
            private: false,
            description: 'Public description',
            html_url: 'https://github.com/LS182/public-one',
            language: 'TypeScript',
            topics: ['portfolio'],
            default_branch: 'main',
          },
          {
            id: 2,
            name: 'secret-repo',
            full_name: 'LS182/secret-repo',
            private: true,
            description: 'Secret internal description',
            html_url: 'https://github.com/LS182/secret-repo',
            language: 'Python',
            topics: ['internal'],
            default_branch: 'main',
          },
        ] : []), { status: 200 })
      }
      if (url.includes('/repos/LS182/public-one/readme')) {
        return new Response(JSON.stringify({
          encoding: 'base64',
          content: Buffer.from('# README — Café', 'utf8').toString('base64'),
        }), { status: 200 })
      }
      return new Response('{}', { status: 404 })
    }) as typeof fetch

    try {
      const repositories = await fetchGitHubRepositories({})
      expect(repositories).toHaveLength(2)
      expect(repositories[0].fullName).toBe('LS182/public-one')
      expect(repositories[0].readme).toBe('# README — Café')
      expect(repositories[1].private).toBe(true)
      expect(repositories[1].htmlUrl).toBeNull()
      expect(repositories[1].description).toBeNull()
      expect(repositories[1].readme).toBeNull()
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
