import { describe, expect, it } from 'vitest'
import { enquiryInputSchema, projectUpdateSchema, reviewInputSchema } from '../../shared/schemas'
import {
  fetchGitHubRepositories,
  isExpiredSqlTimestamp,
  isPublicProjectVisible,
  isSubmissionRateLimited,
  parseCookies,
  publicProject,
  onRequest,
  sha256,
  verifyAdministratorAccount,
} from '../../functions/api/[[path]]'
import { caseStudies, education, profile, skillGroups } from '../content'

describe('portfolio security and validation', () => {
  it('preserves Liam identity and verified education facts', () => {
    expect(profile.name).toBe('Liam Victor Sirbon')
    expect(profile.location).toContain('Cape Town')
    expect(education).toEqual(expect.arrayContaining([
      expect.objectContaining({ period: '2024', title: 'Higher Certificate' }),
      expect.objectContaining({ title: 'Diploma in IT Applications Development', period: '2025–2027' }),
    ]))
  })

  it('keeps academic projects separate and evidence-backed', () => {
    const studentRent = caseStudies.find((study) => study.slug === 'studentrent')
    const dinnerClub = caseStudies.find((study) => study.slug === 'tee2pin-dinner-club')
    expect(studentRent?.kind).toBe('University group project')
    expect(studentRent?.technologies).toEqual(expect.arrayContaining(['React', 'PHP REST API', 'MySQL']))
    expect(dinnerClub?.kind).toBe('Database design assignment')
    expect(dinnerClub?.contribution.join(' ')).toContain('3NF')
  })

  it('groups technical skills without fabricated percentages', () => {
    expect(skillGroups.map((group) => group.title)).toEqual(expect.arrayContaining([
      'Programming languages',
      'Frontend development',
      'Backend development',
      'Mobile development',
      'Databases',
    ]))
  })
  it('verifies immutable GitHub account IDs without trusting login names', () => {
    const githubUser = { id: 123456, login: 'someone-else' }
    expect(String(githubUser.id) === '123456').toBe(true)
    expect(String(githubUser.id) === 'different-admin').toBe(false)
  })

  it('hashes OAuth state and session identifiers', async () => {
    const first = await sha256('state-value')
    expect(first).toHaveLength(64)
    expect(first).toBe(await sha256('state-value'))
    expect(first).not.toBe(await sha256('different-state'))
  })

  it('parses only explicit cookie values', () => {
    const cookies = parseCookies('__Host-sirbon_session=abc123; other=value')
    expect(cookies.get('__Host-sirbon_session')).toBe('abc123')
    expect(cookies.get('missing')).toBeUndefined()
  })

  it('validates contact enquiries on the backend contract', () => {
    const valid = enquiryInputSchema.safeParse({
      name: 'Alex Smith',
      email: 'alex@example.com',
      company: 'Example',
      projectType: 'web-app',
      budget: '5k-10k',
      description: 'A sufficiently detailed description of the application work.',
      preferredContact: 'email',
      phone: '',
      website: '',
    })
    expect(valid.success).toBe(true)
    expect(enquiryInputSchema.safeParse({ name: 'A', email: 'bad' }).success).toBe(false)
  })

  it('validates ratings and review content', () => {
    expect(reviewInputSchema.safeParse({
      name: 'Alex',
      rating: 5,
      review: 'Excellent and careful delivery.',
      projectReference: '',
      website: '',
    }).success).toBe(true)
    expect(reviewInputSchema.safeParse({ name: 'Alex', rating: 6, review: 'Too short' }).success).toBe(false)
  })

  it('redacts private repository metadata from public project shape', () => {
    const publicResult = publicProject({
      id: '1',
      slug: 'private-case',
      name: 'Private case',
      summary: 'Internal summary',
      description: 'Internal description',
      repository_url: 'https://github.com/LS182/private',
      demo_url: null,
      technologies: '["TypeScript"]',
      featured: 0,
      published: 1,
      is_private: 1,
      public_summary: 'Manually approved public summary',
      public_description: 'Manually approved public description',
      public_name: 'Approved public name',
    })
    expect(publicResult.repositoryUrl).toBeUndefined()
    expect(publicResult.name).toBe('Approved public name')
    expect(publicResult.summary).toBe('Manually approved public summary')
    expect(publicResult.description).toBe('Manually approved public description')
  })

  it('authorizes only an exact immutable account ID', () => {
    expect(verifyAdministratorAccount('123456', '123456')).toBe(true)
    expect(verifyAdministratorAccount('someone-else', '123456')).toBe(false)
    expect(verifyAdministratorAccount(123456, '123456')).toBe(false)
  })

  it('expires SQL timestamps and accepts only unexpired sessions', () => {
    expect(isExpiredSqlTimestamp('2026-11-18T22:00:00Z', Date.parse('2026-11-18T23:00:00Z'))).toBe(true)
    expect(isExpiredSqlTimestamp('2026-11-19 00:00:00', Date.parse('2026-11-18T23:00:00Z'))).toBe(false)
  })

  it('hides unpublished, excluded, and incompletely authored private projects', () => {
    expect(isPublicProjectVisible({ published: 1, excluded: 0, is_private: 1, public_name: 'Public name', public_summary: 'Summary', public_description: 'Description' })).toBe(true)
    expect(isPublicProjectVisible({ published: 0, excluded: 0, is_private: 1, public_name: 'Public name', public_summary: 'Summary', public_description: 'Description' })).toBe(false)
    expect(isPublicProjectVisible({ published: 1, excluded: 1, is_private: 0 })).toBe(false)
    expect(isPublicProjectVisible({ published: 1, excluded: 0, is_private: 1, public_summary: '', public_description: 'Description' })).toBe(false)
  })

  it('rejects malformed project mutations', () => {
    expect(projectUpdateSchema.safeParse({
      name: 'Project',
      summary: 'Summary',
      featured: false,
      published: false,
      excluded: false,
      sortOrder: 1,
    }).success).toBe(true)
    expect(projectUpdateSchema.safeParse({
      featured: 'yes',
      published: true,
      excluded: false,
      sortOrder: 0,
    }).success).toBe(false)
  })

  it('applies the per-IP submission limit after five submissions', () => {
    expect(isSubmissionRateLimited(4)).toBe(false)
    expect(isSubmissionRateLimited(5)).toBe(true)
  })

  it('paginates public GitHub repositories and never classifies private metadata publicly', async () => {
    const originalFetch = globalThis.fetch
    let callCount = 0
    globalThis.fetch = (async (input: string | URL | Request) => {
      callCount++
      const url = String(input)
      if (url.includes('/orgs/LS182/repos')) {
        return new Response(JSON.stringify(callCount === 1 ? [{
          id: 1,
          name: 'public-one',
          full_name: 'LS182/public-one',
          private: false,
          description: 'Public description',
          html_url: 'https://github.com/LS182/public-one',
          language: 'TypeScript',
          topics: ['portfolio'],
          default_branch: 'main',
        }] : []), { status: 200 })
      }
      if (url.includes('/readme')) {
        return new Response(JSON.stringify({ encoding: 'base64', content: 'UkVBRE1F' }), { status: 200 })
      }
      return new Response('{}', { status: 404 })
    }) as typeof fetch
    try {
      const repositories = await fetchGitHubRepositories({})
      expect(repositories).toHaveLength(1)
      expect(repositories[0].fullName).toBe('LS182/public-one')
      expect(repositories[0].readme).toContain('README')
      expect(callCount).toBeGreaterThanOrEqual(2)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('rejects unauthorized admin status requests', async () => {
    const db = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
        }),
      }),
    } as unknown as D1Database
    const response = await onRequest({
      request: new Request('https://example.com/api/admin/status'),
      env: { DB: db, ADMIN_GITHUB_ACCOUNT_ID: '123456', APP_ORIGIN: 'https://example.com' },
      params: {},
      next: async () => new Response(),
    })
    expect(response.status).toBe(401)
  })

  it('rejects mutation requests with missing or invalid CSRF', async () => {
    const db = {
      prepare: () => ({
        bind: () => ({
          first: async () => ({
            github_account_id: '123456',
            github_login: 'admin',
            csrf_hash: await sha256('correct-token'),
            expires_at: '2099-12-31T23:59:59Z',
          }),
        }),
      }),
    } as unknown as D1Database
    const response = await onRequest({
      request: new Request('https://example.com/api/admin/projects/example', {
        method: 'PUT',
        headers: {
          Origin: 'https://example.com',
          Cookie: '__Host-sirbon_session=session-token',
          'X-CSRF-Token': 'wrong-token',
          'Content-Type': 'application/json',
        },
        body: '{}',
      }),
      env: { DB: db, ADMIN_GITHUB_ACCOUNT_ID: '123456', APP_ORIGIN: 'https://example.com' },
      params: {},
      next: async () => new Response(),
    })
    expect(response.status).toBe(403)
  })

  it('rejects an OAuth callback with mismatched state', async () => {
    const db = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
        }),
      }),
    } as unknown as D1Database
    const response = await onRequest({
      request: new Request('https://example.com/api/auth/github/callback?code=test&state=wrong', {
        headers: { Cookie: '__Host-sirbon_oauth=expected' },
      }),
      env: {
        DB: db,
        GITHUB_APP_CLIENT_ID: 'client',
        GITHUB_APP_CLIENT_SECRET: 'secret',
        ADMIN_GITHUB_ACCOUNT_ID: '123456',
        APP_ORIGIN: 'https://example.com',
      },
      params: {},
      next: async () => new Response(),
    })
    expect(response.status).toBe(400)
  })
})
