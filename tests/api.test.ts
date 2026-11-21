import { describe, expect, it } from 'vitest'
import { dispatchApiRequest } from '../functions/_lib/router'
import { sha256 } from '../functions/_lib/security/crypto'
import { enquiryInputSchema, projectUpdateSchema, reviewInputSchema } from '../shared/schemas'

describe('API routes, schemas and validation contracts', () => {
  it('validates contact enquiries and reviews against backend schemas', () => {
    expect(enquiryInputSchema.safeParse({
      name: 'Alex Smith',
      email: 'alex@example.com',
      company: 'Example',
      projectType: 'web-app',
      budget: '5k-10k',
      description: 'A sufficiently detailed description of the application work.',
      preferredContact: 'email',
      phone: '',
      website: '',
    }).success).toBe(true)
    expect(enquiryInputSchema.safeParse({ name: 'A', email: 'bad' }).success).toBe(false)

    expect(reviewInputSchema.safeParse({
      name: 'Alex',
      rating: 5,
      review: 'Excellent and careful delivery.',
      projectReference: '',
      website: '',
    }).success).toBe(true)
    expect(reviewInputSchema.safeParse({ name: 'Alex', rating: 6, review: 'Too short' }).success).toBe(false)
  })

  it('rejects malformed project mutations and allows clearing optional fields', () => {
    expect(projectUpdateSchema.safeParse({
      name: 'Project',
      summary: 'Summary',
      publicName: '',
      demoUrl: '',
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

  it('reports health and GitHub integration readiness without leaking secrets', async () => {
    const healthRes = await dispatchApiRequest(
      new Request('https://example.com/api/health'),
      { GITHUB_APP_CLIENT_ID: 'client', GITHUB_APP_CLIENT_SECRET: 'secret' },
    )
    expect(healthRes.status).toBe(200)
    const healthBody = await healthRes.json() as Record<string, unknown>
    expect(healthBody.ok).toBe(true)
    expect(healthBody.githubOAuthConfigured).toBe(true)
    expect(healthBody.githubInstallationConfigured).toBe(false)
    expect(JSON.stringify(healthBody)).not.toContain('secret')

    const ghStatusRes = await dispatchApiRequest(new Request('https://example.com/api/github/status'), {})
    expect(ghStatusRes.status).toBe(200)
    const ghStatus = await ghStatusRes.json() as Record<string, unknown>
    expect(ghStatus.publicRepositoriesEnabled).toBe(true)
    expect(ghStatus.privateRepositoriesEnabled).toBe(false)
  })

  it('returns 405 for unsupported HTTP methods and 404 JSON for unknown API routes', async () => {
    const methodRes = await dispatchApiRequest(
      new Request('https://example.com/api/health', {
        method: 'DELETE',
        headers: { Origin: 'https://example.com' },
      }),
      { APP_ORIGIN: 'https://example.com' },
    )
    expect(methodRes.status).toBe(405)

    const notFoundRes = await dispatchApiRequest(
      new Request('https://example.com/api/does-not-exist'),
      {},
    )
    expect(notFoundRes.status).toBe(404)
    const body = await notFoundRes.json() as { error?: string }
    expect(body.error).toBe('Not found')
  })

  it('prevents publishing a private repository without approved public case-study fields', async () => {
    const db = {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => {
            if (sql.includes('FROM auth_sessions')) {
              return {
                github_account_id: '123456',
                github_login: 'admin',
                csrf_hash: await sha256('valid-csrf'),
                expires_at: '2099-12-31T23:59:59Z',
              }
            }
            if (sql.includes('FROM projects')) {
              return { slug: 'private-repo', is_private: 1 }
            }
            return null
          },
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database

    const response = await dispatchApiRequest(
      new Request('https://example.com/api/admin/projects/private-repo', {
        method: 'PUT',
        headers: {
          Origin: 'https://example.com',
          Cookie: '__Host-sirbon_session=session-token; sirbon_csrf=valid-csrf',
          'X-CSRF-Token': 'valid-csrf',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'private-repo',
          summary: 'internal',
          publicName: '',
          publicSummary: '',
          publicDescription: '',
          featured: false,
          published: true,
          excluded: false,
          sortOrder: 0,
        }),
      }),
      { DB: db, ADMIN_GITHUB_ACCOUNT_ID: '123456', APP_ORIGIN: 'https://example.com' },
    )
    expect(response.status).toBe(400)
    const body = await response.json() as { error?: string }
    expect(body.error).toContain('Private repositories require')
  })
})
