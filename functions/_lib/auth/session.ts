import type { Env } from '../config/env'
import { deleteSessionByHash, findSessionByHash } from '../database/auth'
import { json } from '../http/response'
import {
  clearAuthSessionCookies,
  CSRF_COOKIE_NAME,
  parseCookies,
  readSessionCookie,
} from '../security/cookies'
import { constantTimeEqual, sha256 } from '../security/crypto'

export interface AdminSession {
  githubAccountId: string
  githubLogin: string
  csrfToken: string
}

export function verifyAdministratorAccount(
  githubAccountId: unknown,
  allowlistValue: string | undefined,
): boolean {
  if (typeof githubAccountId !== 'string' || !githubAccountId.trim()) return false
  if (typeof allowlistValue !== 'string' || !allowlistValue.trim()) return false
  return constantTimeEqual(githubAccountId, allowlistValue.trim())
}

export function isExpiredSqlTimestamp(value: string, now = Date.now()): boolean {
  const normalized = /\dT/.test(value) ? value : value.replace(' ', 'T') + 'Z'
  const timestamp = new Date(normalized).getTime()
  return !Number.isFinite(timestamp) || timestamp <= now
}

export async function requireSession(context: {
  request: Request
  env: Env
}): Promise<{ session: AdminSession | null; response?: Response }> {
  const requestCookies = parseCookies(context.request.headers.get('Cookie'))
  const raw = readSessionCookie(requestCookies)
  if (!raw) return { session: null, response: json({ error: 'Unauthorized' }, 401) }

  if (!context.env.DB) return { session: null, response: json({ error: 'Database unavailable' }, 503) }

  const sessionHash = await sha256(raw)
  const row = await findSessionByHash(context.env.DB, sessionHash)
  if (!row || isExpiredSqlTimestamp(row.expires_at)) {
    return { session: null, response: json({ error: 'Unauthorized' }, 401) }
  }

  if (!verifyAdministratorAccount(row.github_account_id, context.env.ADMIN_GITHUB_ACCOUNT_ID)) {
    return { session: null, response: json({ error: 'Forbidden' }, 403) }
  }

  const csrfHeader = context.request.headers.get('X-CSRF-Token') || ''
  const csrfCookie = requestCookies.get(CSRF_COOKIE_NAME) || ''
  const csrfToken = csrfCookie || csrfHeader

  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    if (!csrfHeader) {
      return { session: null, response: json({ error: 'Invalid CSRF token' }, 403) }
    }
    const headerHash = await sha256(csrfHeader)
    if (!constantTimeEqual(headerHash, row.csrf_hash)) {
      return { session: null, response: json({ error: 'Invalid CSRF token' }, 403) }
    }
    if (csrfCookie && !constantTimeEqual(csrfCookie, csrfHeader)) {
      return { session: null, response: json({ error: 'Invalid CSRF token' }, 403) }
    }
  }

  return {
    session: {
      githubAccountId: row.github_account_id,
      githubLogin: row.github_login,
      csrfToken,
    },
  }
}

export async function performLogout(context: { request: Request; env: Env }): Promise<Response> {
  const auth = await requireSession(context)
  if (!auth.session) return auth.response!

  const cookies = parseCookies(context.request.headers.get('Cookie'))
  const raw = readSessionCookie(cookies)
  if (raw && context.env.DB) {
    await deleteSessionByHash(context.env.DB, await sha256(raw))
  }

  const headers = new Headers({
    'Clear-Site-Data': '"cookies", "storage", "cache"',
  })
  for (const cookie of clearAuthSessionCookies(context.request)) {
    headers.append('Set-Cookie', cookie)
  }
  return json({ loggedOut: true }, 200, headers)
}
