import { describe, expect, it } from 'vitest'
import { isExpiredSqlTimestamp, verifyAdministratorAccount } from '../functions/_lib/auth/session'
import { isSubmissionRateLimited } from '../functions/_lib/database/rateLimit'
import { dispatchApiRequest } from '../functions/_lib/router'
import { parseCookies } from '../functions/_lib/security/cookies'
import { constantTimeEqual, sha256 } from '../functions/_lib/security/crypto'

describe('authentication, session, CSRF and API security', () => {
  it('authorizes only an exact immutable numeric GitHub account ID', () => {
    expect(verifyAdministratorAccount('123456', '123456')).toBe(true)
    expect(verifyAdministratorAccount('someone-else', '123456')).toBe(false)
    expect(verifyAdministratorAccount(123456, '123456')).toBe(false)
    expect(verifyAdministratorAccount('', '123456')).toBe(false)
    expect(verifyAdministratorAccount('123456', undefined)).toBe(false)
  })

  it('hashes OAuth state and session identifiers deterministically and compares in constant time', async () => {
    const first = await sha256('state-value')
    expect(first).toHaveLength(64)
    expect(constantTimeEqual(first, await sha256('state-value'))).toBe(true)
    expect(constantTimeEqual(first, await sha256('different-state'))).toBe(false)
  })

  it('parses only explicit cookie values', () => {
    const cookies = parseCookies('__Host-sirbon_session=abc123; other=value')
    expect(cookies.get('__Host-sirbon_session')).toBe('abc123')
    expect(cookies.get('missing')).toBeUndefined()
  })

  it('expires SQL timestamps and accepts only unexpired sessions', () => {
    expect(isExpiredSqlTimestamp('2026-11-18T22:00:00Z', Date.parse('2026-11-18T23:00:00Z'))).toBe(true)
    expect(isExpiredSqlTimestamp('2026-11-19 00:00:00', Date.parse('2026-11-18T23:00:00Z'))).toBe(false)
  })

  it('applies the per-IP submission limit after five submissions', () => {
    expect(isSubmissionRateLimited(4)).toBe(false)
    expect(isSubmissionRateLimited(5)).toBe(true)
  })

  it('rejects unauthorized admin status requests', async () => {
    const db = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
        }),
      }),
    } as unknown as D1Database

    const response = await dispatchApiRequest(
      new Request('https://example.com/api/admin/status'),
      { DB: db, ADMIN_GITHUB_ACCOUNT_ID: '123456', APP_ORIGIN: 'https://example.com' },
    )
    expect(response.status).toBe(401)
  })

  it('rejects cross-site non-navigational Fetch Metadata requests before auth', async () => {
    const response = await dispatchApiRequest(
      new Request('https://example.com/api/admin/status', {
        headers: {
          'Sec-Fetch-Site': 'cross-site',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Dest': 'empty',
        },
      }),
      { APP_ORIGIN: 'https://example.com' },
    )
    expect(response.status).toBe(403)
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

    const response = await dispatchApiRequest(
      new Request('https://example.com/api/admin/projects/example', {
        method: 'PUT',
        headers: {
          Origin: 'https://example.com',
          Cookie: '__Host-sirbon_session=session-token',
          'X-CSRF-Token': 'wrong-token',
          'Content-Type': 'application/json',
        },
        body: '{}',
      }),
      { DB: db, ADMIN_GITHUB_ACCOUNT_ID: '123456', APP_ORIGIN: 'https://example.com' },
    )
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

    const response = await dispatchApiRequest(
      new Request('https://example.com/api/auth/github/callback?code=test&state=wrong', {
        headers: {
          Cookie: '__Host-sirbon_oauth=expected',
          'Sec-Fetch-Site': 'cross-site',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Dest': 'document',
        },
      }),
      {
        DB: db,
        GITHUB_APP_CLIENT_ID: 'client',
        GITHUB_APP_CLIENT_SECRET: 'secret',
        ADMIN_GITHUB_ACCOUNT_ID: '123456',
        APP_ORIGIN: 'https://example.com',
      },
    )
    expect(response.status).toBe(400)
  })

  it('preserves multiple Set-Cookie headers and emits Clear-Site-Data on logout', async () => {
    const db = {
      prepare: () => ({
        bind: () => ({
          first: async () => ({
            github_account_id: '123456',
            github_login: 'admin',
            csrf_hash: await sha256('valid-csrf'),
            expires_at: '2099-12-31T23:59:59Z',
          }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database

    const response = await dispatchApiRequest(
      new Request('https://example.com/api/admin/logout', {
        method: 'POST',
        headers: {
          Origin: 'https://example.com',
          Cookie: '__Host-sirbon_session=session-token; sirbon_csrf=valid-csrf',
          'X-CSRF-Token': 'valid-csrf',
        },
      }),
      { DB: db, ADMIN_GITHUB_ACCOUNT_ID: '123456', APP_ORIGIN: 'https://example.com' },
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Clear-Site-Data')).toContain('cookies')
    const setCookies = response.headers.getSetCookie()
    expect(setCookies.length).toBe(2)
    expect(setCookies.some((cookie) => cookie.startsWith('__Host-sirbon_session=;'))).toBe(true)
    expect(setCookies.some((cookie) => cookie.startsWith('sirbon_csrf=;'))).toBe(true)
  })
})
