import type { Env } from '../config/env'
import {
  consumeOAuthState,
  replaceAdminSession,
  saveOAuthState,
  upsertAdministrator,
} from '../database/auth'
import { resolveAppOrigin } from '../http/origin'
import { json, redirect } from '../http/response'
import {
  buildAuthSessionCookies,
  buildOAuthStateCookie,
  clearOAuthStateCookie,
  parseCookies,
  readOAuthCookie,
} from '../security/cookies'
import { constantTimeEqual, randomToken, sha256 } from '../security/crypto'
import { isExpiredSqlTimestamp, verifyAdministratorAccount } from './session'

const OAUTH_CALLBACK_PATH = '/api/auth/github/callback'
const OAUTH_SCOPE = 'read:user'

export async function initiateGitHubOAuth(request: Request, env: Env): Promise<Response> {
  if (!env.GITHUB_APP_CLIENT_ID) {
    return json({ error: 'GitHub OAuth is not configured' }, 503)
  }
  if (!env.DB) {
    return json({ error: 'Database unavailable' }, 503)
  }

  const state = randomToken()
  const stateHash = await sha256(state)
  await saveOAuthState(env.DB, stateHash)

  const origin = resolveAppOrigin(request, env)
  const redirectUri = new URL(OAUTH_CALLBACK_PATH, origin)

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize')
  authorizeUrl.searchParams.set('client_id', env.GITHUB_APP_CLIENT_ID)
  authorizeUrl.searchParams.set('redirect_uri', redirectUri.toString())
  authorizeUrl.searchParams.set('scope', OAUTH_SCOPE)
  authorizeUrl.searchParams.set('state', state)

  return redirect(authorizeUrl.toString(), [buildOAuthStateCookie(request, state)])
}

export async function handleGitHubOAuthCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  if (oauthError || !code || !state) {
    return json({ error: 'GitHub authorization was denied or incomplete' }, 400)
  }
  if (!env.DB || !env.GITHUB_APP_CLIENT_ID || !env.GITHUB_APP_CLIENT_SECRET) {
    return json({ error: 'GitHub OAuth is not configured' }, 503)
  }

  const cookies = parseCookies(request.headers.get('Cookie'))
  const cookieState = readOAuthCookie(cookies)
  if (!cookieState || !constantTimeEqual(cookieState, state)) {
    return json({ error: 'Invalid OAuth state' }, 400)
  }

  const stateHash = await sha256(state)
  const stateRow = await consumeOAuthState(env.DB, stateHash)
  if (!stateRow || isExpiredSqlTimestamp(stateRow.expires_at)) {
    return json({ error: 'OAuth state expired' }, 400)
  }

  const origin = resolveAppOrigin(request, env)
  const redirectUri = new URL(OAUTH_CALLBACK_PATH, origin).toString()

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'sirbon-dev',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_APP_CLIENT_ID,
      client_secret: env.GITHUB_APP_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  })
  if (!tokenResponse.ok) {
    return json({ error: 'GitHub authorization failed' }, 401)
  }

  const tokenResult = await tokenResponse.json().catch(() => ({})) as { access_token?: string; error?: string }
  if (!tokenResult.access_token) {
    return json({ error: 'GitHub authorization failed' }, 401)
  }

  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${tokenResult.access_token}`,
      'User-Agent': 'sirbon-dev',
    },
  })
  if (!userResponse.ok) {
    return json({ error: 'Unable to verify GitHub identity' }, 401)
  }

  const githubUser = await userResponse.json() as { id?: number; login?: string }
  if (typeof githubUser.id !== 'number' || typeof githubUser.login !== 'string') {
    return json({ error: 'Unable to verify GitHub identity' }, 401)
  }

  const accountId = String(githubUser.id)
  if (!verifyAdministratorAccount(accountId, env.ADMIN_GITHUB_ACCOUNT_ID)) {
    return json({ error: 'Forbidden' }, 403)
  }

  await upsertAdministrator(env.DB, accountId, githubUser.login)

  const rawSession = randomToken()
  const sessionHash = await sha256(rawSession)
  const csrfToken = randomToken()
  const csrfHash = await sha256(csrfToken)

  await replaceAdminSession(env.DB, {
    sessionHash,
    csrfHash,
    accountId,
    login: githubUser.login,
  })

  const destination = `${origin}/admin/dashboard`
  return redirect(destination, [
    ...buildAuthSessionCookies(request, rawSession, csrfToken),
    clearOAuthStateCookie(request),
  ])
}
