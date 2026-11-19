import { enquiryInputSchema, projectUpdateSchema, reviewInputSchema } from '../../shared/schemas'

export interface Env {
  DB?: D1Database
  GITHUB_APP_CLIENT_ID?: string
  GITHUB_APP_CLIENT_SECRET?: string
  GITHUB_APP_PRIVATE_KEY?: string
  GITHUB_APP_INSTALLATION_ID?: string
  ADMIN_GITHUB_ACCOUNT_ID?: string
  SESSION_SECRET?: string
  APP_ORIGIN?: string
  NOTIFICATION_WEBHOOK_URL?: string
}

type Session = {
  githubAccountId: string
  githubLogin: string
  csrfToken: string
}

const jsonHeaders = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }

export function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...jsonHeaders, ...Object.fromEntries(new Headers(headers)) },
  })
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function randomToken(bytes = 32) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function parseCookies(header: string | null) {
  const result = new Map<string, string>()
  for (const part of (header || '').split(';')) {
    const index = part.indexOf('=')
    if (index > 0) {
      try {
        result.set(part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim()))
      } catch {
        result.set(part.slice(0, index).trim(), part.slice(index + 1).trim())
      }
    }
  }
  return result
}

function safeJsonParse<T>(value: unknown, fallback: T): T {
  try {
    return JSON.parse(String(value || '')) as T
  } catch {
    return fallback
  }
}

function ipHash(request: Request) {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown'
  return sha256(ip)
}

async function validOrigin(request: Request, env: Env) {
  if (request.method === 'GET' || request.method === 'HEAD') return true
  const origin = request.headers.get('Origin')
  if (!origin) return false
  try {
    const supplied = new URL(origin)
    const expected = env.APP_ORIGIN ? new URL(env.APP_ORIGIN) : new URL(request.url)
    return supplied.origin === expected.origin
  } catch {
    return false
  }
}

export function verifyAdministratorAccount(githubAccountId: unknown, allowlistValue: string | undefined) {
  return typeof githubAccountId === 'string'
    && Boolean(allowlistValue)
    && githubAccountId === allowlistValue
}

export function isExpiredSqlTimestamp(value: string, now = Date.now()) {
  const normalized = /\dT/.test(value) ? value : value.replace(' ', 'T') + 'Z'
  const timestamp = new Date(normalized).getTime()
  return !Number.isFinite(timestamp) || timestamp <= now
}

export function isPublicProjectVisible(row: Record<string, unknown>) {
  if (row.published !== 1 && row.published !== true) return false
  if (row.excluded === 1 || row.excluded === true) return false
  if (row.is_private !== 1 && row.is_private !== true) return true
  return Boolean(
    typeof row.public_summary === 'string' && row.public_summary.trim()
    && typeof row.public_description === 'string' && row.public_description.trim()
    && typeof row.public_name === 'string' && row.public_name.trim(),
  )
}

export function isSubmissionRateLimited(count: number | undefined, limit = 5) {
  return (count || 0) >= limit
}

async function requireSession(context: { request: Request; env: Env }): Promise<{ session: Session | null; response?: Response }> {
  const requestCookies = parseCookies(context.request.headers.get('Cookie'))
  const raw = requestCookies.get('__Host-sirbon_session')
  if (!raw) return { session: null, response: json({ error: 'Unauthorized' }, 401) }
  const sessionHash = await sha256(raw)
  if (!context.env.DB) return { session: null, response: json({ error: 'Database unavailable' }, 503) }
  const row = await context.env.DB.prepare(
    'SELECT github_account_id, github_login, csrf_hash, expires_at FROM auth_sessions WHERE session_hash = ?',
  ).bind(sessionHash).first<{
    github_account_id: string
    github_login: string
    csrf_hash: string
    expires_at: string
  }>()
  if (!row || isExpiredSqlTimestamp(row.expires_at)) {
    return { session: null, response: json({ error: 'Unauthorized' }, 401) }
  }
  if (!verifyAdministratorAccount(row.github_account_id, context.env.ADMIN_GITHUB_ACCOUNT_ID)) {
    return { session: null, response: json({ error: 'Forbidden' }, 403) }
  }
  const csrf = context.request.headers.get('X-CSRF-Token')
  const csrfCookie = requestCookies.get('sirbon_csrf') || ''
  const csrfToken = csrfCookie || csrf || ''
  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    if (!csrf || await sha256(csrf) !== row.csrf_hash) {
      return { session: null, response: json({ error: 'Invalid CSRF token' }, 403) }
    }
  }
  return { session: { githubAccountId: row.github_account_id, githubLogin: row.github_login, csrfToken: csrfToken } }
}

async function pemToCryptoKey(pem: string) {
  const normalized = pem.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/\s/g, '')
  const binary = atob(normalized)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return crypto.subtle.importKey('pkcs8', bytes, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
}

async function githubAppToken(env: Env) {
  if (!env.GITHUB_APP_PRIVATE_KEY || !env.GITHUB_APP_INSTALLATION_ID) return null
  const now = Math.floor(Date.now() / 1000)
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  const header = encode({ alg: 'RS256', typ: 'JWT' })
  const payload = encode({ iat: now - 60, exp: now + 540, iss: env.GITHUB_APP_CLIENT_ID })
  const signingInput = `${header}.${payload}`
  const key = await pemToCryptoKey(env.GITHUB_APP_PRIVATE_KEY)
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput))
  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  const appJwt = `${signingInput}.${sigBase64}`
  const response = await fetch(`https://api.github.com/app/installations/${env.GITHUB_APP_INSTALLATION_ID}/access_tokens`, {
    method: 'POST',
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${appJwt}`, 'User-Agent': 'sirbon-dev' },
  })
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) return null
    throw new Error(`GitHub installation token request failed (${response.status})`)
  }
  const result = await response.json() as { token?: string }
  return result.token || null
}

export async function fetchGitHubRepositories(env: Env) {
  const installationToken = await githubAppToken(env)
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'sirbon-dev',
  }
  if (installationToken) headers.Authorization = `Bearer ${installationToken}`

  const repositories: Array<Record<string, unknown>> = []
  if (installationToken) {
    for (let page = 1; page <= 10; page++) {
      const response = await fetch(`https://api.github.com/installation/repositories?per_page=100&page=${page}`, { headers })
      if (response.status === 403 || response.status === 429) {
        throw new Error(`GitHub API rate limit or access denied (${response.status})`)
      }
      if (!response.ok) throw new Error(`GitHub installation request failed (${response.status})`)
      const result = await response.json() as { repositories?: Array<Record<string, unknown>>, total_count?: number }
      repositories.push(...(result.repositories || []))
      if (!result.repositories?.length || repositories.length >= (result.total_count || 0)) break
    }
  } else {
    for (let page = 1; page <= 10; page++) {
      const response = await fetch(`https://api.github.com/orgs/LS182/repos?per_page=100&type=all&page=${page}`, { headers })
      if (response.status === 403 || response.status === 429) {
        throw new Error(`GitHub API rate limit or access denied (${response.status})`)
      }
      if (!response.ok) throw new Error(`GitHub public repository request failed (${response.status})`)
      const result = await response.json() as Array<Record<string, unknown>>
      repositories.push(...result)
      if (result.length < 100) break
    }
  }

  const parsed = []
  for (const repository of repositories) {
    const fullName = String(repository.full_name || '')
    if (!fullName.startsWith('LS182/')) continue
    const isPrivate = Boolean(repository.private)
    let readme: string | null = null
    if (!isPrivate) {
      try {
        const readmeResponse = await fetch(`https://api.github.com/repos/${fullName}/readme`, { headers })
        if (readmeResponse.ok) {
          const readmeResult = await readmeResponse.json() as { content?: string; encoding?: string }
          if (readmeResult.encoding === 'base64' && typeof readmeResult.content === 'string') {
            readme = atob(readmeResult.content.replace(/\n/g, '')).slice(0, 200000)
          }
        }
      } catch {
        readme = null
      }
    }
    const result: Record<string, unknown> = {
      id: String(repository.id),
      name: String(repository.name || ''),
      fullName,
      description: isPrivate ? null : (typeof repository.description === 'string' ? repository.description : null),
      htmlUrl: isPrivate ? null : (typeof repository.html_url === 'string' ? repository.html_url : null),
      homepage: isPrivate ? null : (typeof repository.homepage === 'string' ? repository.homepage : null),
      defaultBranch: typeof repository.default_branch === 'string' ? repository.default_branch : null,
      language: isPrivate ? null : (typeof repository.language === 'string' ? repository.language : null),
      topics: isPrivate ? [] : (Array.isArray(repository.topics) ? repository.topics.filter((item): item is string => typeof item === 'string') : []),
      private: isPrivate,
      archived: Boolean(repository.archived),
      disabled: Boolean(repository.disabled),
      fork: Boolean(repository.fork),
      updatedAt: typeof repository.updated_at === 'string' ? repository.updated_at : null,
      readme,
    }
    parsed.push(result)
  }
  return parsed
}

export async function synchronizeRepositories(db: D1Database, env: Env, githubLogin: string) {
  const syncId = crypto.randomUUID()
  await db.prepare(
    'INSERT INTO repository_sync_history (id, status, initiated_by) VALUES (?, ?, ?)',
  ).bind(syncId, 'running', githubLogin).run()
  try {
    const repositories = await fetchGitHubRepositories(env)
    const statements = []
    for (const repo of repositories) {
      statements.push(
        db.prepare(`
          INSERT INTO projects (
            id, slug, name, summary, description, repository_url, demo_url,
            technologies, featured, published, excluded, repository_id, repository_full_name,
            is_private, default_branch, language, topics, synced_at
            , readme_cached
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
          ON CONFLICT(slug) DO UPDATE SET
            repository_id=excluded.repository_id,
            repository_full_name=excluded.repository_full_name,
            is_private=excluded.is_private,
            published=CASE WHEN excluded.is_private=1 THEN 0 ELSE projects.published END,
            featured=CASE WHEN excluded.is_private=1 THEN 0 ELSE projects.featured END,
            excluded=CASE WHEN excluded.is_private=1 THEN 1 ELSE projects.excluded END,
            default_branch=excluded.default_branch,
            language=CASE WHEN excluded.is_private = 0 THEN excluded.language ELSE projects.language END,
            topics=CASE WHEN excluded.is_private = 0 THEN excluded.topics ELSE projects.topics END,
            readme_cached=CASE WHEN excluded.is_private = 0 THEN excluded.readme_cached ELSE projects.readme_cached END,
            synced_at=CURRENT_TIMESTAMP,
            updated_at=CURRENT_TIMESTAMP
        `).bind(
          crypto.randomUUID(),
          String(repo.fullName).replace(/^LS182\//, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          String(repo.name),
          '',
          null,
          repo.private ? null : repo.htmlUrl,
          repo.private ? null : repo.homepage,
          JSON.stringify(repo.private ? [] : (repo.language ? [repo.language] : [])),
          repo.private ? 1 : 0,
          String(repo.id),
          String(repo.fullName),
          repo.private ? 1 : 0,
          repo.defaultBranch,
          repo.language,
          JSON.stringify(repo.topics),
          repo.private ? null : repo.readme,
        ),
      )
    }
    if (statements.length) await db.batch(statements)
    const publicCount = repositories.filter((repo) => !repo.private).length
    await db.prepare(
      'UPDATE repository_sync_history SET completed_at=CURRENT_TIMESTAMP, status=?, repository_count=?, public_count=?, private_count=? WHERE id=?',
    ).bind('success', repositories.length, publicCount, repositories.length - publicCount, syncId).run()
    return { success: true, repositoryCount: repositories.length, publicCount, privateCount: repositories.length - publicCount }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Repository synchronization failed'
    await db.prepare(
      'UPDATE repository_sync_history SET completed_at=CURRENT_TIMESTAMP, status=?, error_message=? WHERE id=?',
    ).bind('failed', message, syncId).run()
    throw error
  }
}

export function publicProject(row: Record<string, unknown>) {
  const privateProject = Boolean(row.is_private)
  return {
    id: row.id,
    slug: row.slug,
    name: privateProject ? row.public_name : row.name,
    summary: privateProject && row.public_summary ? row.public_summary : row.summary,
    description: privateProject && row.public_description ? row.public_description : row.description,
    repositoryUrl: privateProject ? undefined : row.repository_url,
    demoUrl: privateProject ? undefined : row.demo_url,
    technologies: safeJsonParse(row.technologies, []),
    featured: Boolean(row.featured),
    published: Boolean(row.published),
    updatedAt: row.updated_at,
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api\/?/, '')

  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })

  if (!await validOrigin(request, env) && request.method !== 'GET' && request.method !== 'HEAD') {
    return json({ error: 'Invalid origin' }, 403)
  }

  if (path === 'health') {
    return json({
      ok: true,
      d1: Boolean(env.DB),
      githubAppConfigured: Boolean(env.GITHUB_APP_CLIENT_ID && env.GITHUB_APP_CLIENT_SECRET),
      githubInstallationConfigured: Boolean(env.GITHUB_APP_PRIVATE_KEY && env.GITHUB_APP_INSTALLATION_ID),
    })
  }

  if (path === 'github/status') {
    return json({
      configured: Boolean(env.GITHUB_APP_CLIENT_ID),
      publicRepositoriesEnabled: true,
      privateRepositoriesEnabled: Boolean(env.GITHUB_APP_PRIVATE_KEY && env.GITHUB_APP_INSTALLATION_ID),
    })
  }

  if (path === 'auth/github') {
    if (!env.GITHUB_APP_CLIENT_ID) return json({ error: 'GitHub App is not configured' }, 503)
    if (!env.DB) return json({ error: 'Database unavailable' }, 503)
    const state = randomToken()
    const stateHash = await sha256(state)
    await env.DB.prepare(
      "INSERT INTO oauth_states (state_hash, expires_at) VALUES (?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+10 minutes'))",
    ).bind(stateHash).run()
    await env.DB.prepare("DELETE FROM oauth_states WHERE expires_at < CURRENT_TIMESTAMP").run()
    const redirectUri = new URL('/api/auth/github/callback', url.origin)
    const authorize = new URL('https://github.com/login/oauth/authorize')
    authorize.searchParams.set('client_id', env.GITHUB_APP_CLIENT_ID)
    authorize.searchParams.set('redirect_uri', redirectUri.toString())
    authorize.searchParams.set('scope', 'read:user')
    authorize.searchParams.set('state', state)
    const cookie = `__Host-sirbon_oauth=${encodeURIComponent(state)}; Path=/api/auth/github/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
    return new Response(null, { status: 302, headers: { Location: authorize.toString(), 'Set-Cookie': cookie, 'Cache-Control': 'no-store' } })
  }

  if (path === 'auth/github/callback') {
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')
    if (error || !code || !state) return json({ error: 'GitHub authorization was denied or incomplete' }, 400)
    if (!env.DB || !env.GITHUB_APP_CLIENT_ID || !env.GITHUB_APP_CLIENT_SECRET) {
      return json({ error: 'GitHub OAuth is not configured' }, 503)
    }
    const cookies = parseCookies(request.headers.get('Cookie'))
    const cookieState = cookies.get('__Host-sirbon_oauth')
    if (!cookieState || cookieState !== state) return json({ error: 'Invalid OAuth state' }, 400)
    const stateHash = await sha256(state)
    const stateRow = await env.DB.prepare(
      'SELECT expires_at FROM oauth_states WHERE state_hash = ?',
    ).bind(stateHash).first<{ expires_at: string }>()
    await env.DB.prepare('DELETE FROM oauth_states WHERE state_hash = ?').bind(stateHash).run()
    if (!stateRow || isExpiredSqlTimestamp(stateRow.expires_at)) {
      return json({ error: 'OAuth state expired' }, 400)
    }

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'sirbon-dev' },
      body: JSON.stringify({
        client_id: env.GITHUB_APP_CLIENT_ID,
        client_secret: env.GITHUB_APP_CLIENT_SECRET,
        code,
      }),
    })
    const tokenResult = await tokenResponse.json() as { access_token?: string; error?: string }
    if (!tokenResult.access_token) return json({ error: 'GitHub authorization failed' }, 401)
    const userResponse = await fetch('https://api.github.com/user', {
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${tokenResult.access_token}`, 'User-Agent': 'sirbon-dev' },
    })
    if (!userResponse.ok) return json({ error: 'Unable to verify GitHub identity' }, 401)
    const githubUser = await userResponse.json() as { id: number; login: string }
    const accountId = String(githubUser.id)
    if (!verifyAdministratorAccount(accountId, env.ADMIN_GITHUB_ACCOUNT_ID)) {
      return json({ error: 'Forbidden' }, 403)
    }
    await env.DB.prepare(
      'INSERT INTO administrators (github_account_id, github_login) VALUES (?, ?) ON CONFLICT(github_account_id) DO UPDATE SET github_login=excluded.github_login, updated_at=CURRENT_TIMESTAMP',
    ).bind(accountId, githubUser.login).run()
    const rawSession = randomToken()
    const sessionHash = await sha256(rawSession)
    const csrfToken = randomToken()
    const csrfHash = await sha256(csrfToken)
    await env.DB.prepare('DELETE FROM auth_sessions WHERE github_account_id=?').bind(accountId).run()
    await env.DB.prepare(
      "INSERT INTO auth_sessions (id, session_hash, csrf_hash, github_account_id, github_login, expires_at) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+12 hours'))",
    ).bind(crypto.randomUUID(), sessionHash, csrfHash, accountId, githubUser.login).run()
    await env.DB.prepare("DELETE FROM auth_sessions WHERE expires_at < CURRENT_TIMESTAMP").run()
    const destination = env.APP_ORIGIN ? `${env.APP_ORIGIN}/admin/dashboard` : '/admin/dashboard'
    const sessionCookie = `__Host-sirbon_session=${encodeURIComponent(rawSession)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`
    const csrfCookie = `sirbon_csrf=${encodeURIComponent(csrfToken)}; Path=/; Secure; SameSite=Strict; Max-Age=43200`
    const clearState = '__Host-sirbon_oauth=; Path=/api/auth/github/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
    const headers = new Headers({ Location: destination, 'Cache-Control': 'no-store' })
    headers.append('Set-Cookie', sessionCookie)
    headers.append('Set-Cookie', csrfCookie)
    headers.append('Set-Cookie', clearState)
    return new Response(null, {
      status: 302,
      headers,
    })
  }

  if (path === 'auth/logout' && request.method === 'POST') {
    const auth = await requireSession(context)
    if (!auth.session) return auth.response!
    const cookies = parseCookies(request.headers.get('Cookie'))
    const raw = cookies.get('__Host-sirbon_session')
    if (raw && env.DB) await env.DB.prepare('DELETE FROM auth_sessions WHERE session_hash=?').bind(await sha256(raw)).run()
    const headers = new Headers()
    headers.append('Set-Cookie', '__Host-sirbon_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0')
    headers.append('Set-Cookie', 'sirbon_csrf=; Path=/; Secure; SameSite=Strict; Max-Age=0')
    return json({ loggedOut: true }, 200, headers)
  }

  if (path === 'projects' && request.method === 'GET') {
    if (!env.DB) return json({ projects: [] })
    try {
      const result = await env.DB.prepare(`
        SELECT * FROM projects
        WHERE published=1 AND excluded=0
          AND (is_private=0 OR (public_name IS NOT NULL AND public_name <> '' AND public_summary IS NOT NULL AND public_summary <> '' AND public_description IS NOT NULL AND public_description <> ''))
        ORDER BY featured DESC, sort_order ASC, name ASC
      `).all()
      return json({ projects: (result.results || []).map((row) => publicProject(row as unknown as Record<string, unknown>)) })
    } catch {
      return json({ error: 'Projects unavailable' }, 503)
    }
  }

  if (path.startsWith('projects/') && request.method === 'GET') {
    const slug = path.slice('projects/'.length)
    if (!env.DB) return json({ error: 'Not found' }, 404)
    try {
      const row = await env.DB.prepare(`
        SELECT * FROM projects
        WHERE slug=? AND published=1 AND excluded=0
          AND (is_private=0 OR (public_name IS NOT NULL AND public_name <> '' AND public_summary IS NOT NULL AND public_summary <> '' AND public_description IS NOT NULL AND public_description <> ''))
      `).bind(slug).first()
      if (!row) return json({ error: 'Not found' }, 404)
      return json({ project: publicProject(row as unknown as Record<string, unknown>) })
    } catch {
      return json({ error: 'Project unavailable' }, 503)
    }
  }

  if (path === 'reviews' && request.method === 'GET') {
    if (!env.DB) return json({ reviews: [] })
    const result = await env.DB.prepare(
      'SELECT id, name, rating, review, project_reference, created_at FROM reviews WHERE status=? ORDER BY created_at DESC LIMIT 50',
    ).bind('approved').all()
    return json({ reviews: result.results || [] })
  }

  if (path === 'reviews' && request.method === 'POST') {
    if (!env.DB) return json({ error: 'Database unavailable' }, 503)
    const body = await request.json().catch(() => null)
    const parsed = reviewInputSchema.safeParse(body)
    if (!parsed.success) return json({ error: 'Review validation failed', issues: parsed.error.issues }, 400)
    if (parsed.data.website) return json({ submitted: true }, 202)
    const reviewerIp = await ipHash(request)
    const limit = await env.DB.prepare(
      "SELECT COUNT(*) count FROM submission_limits WHERE ip_hash=? AND endpoint='review' AND created_at > datetime('now', '-1 hour')",
    ).bind(reviewerIp).first<{ count: number }>()
    if (isSubmissionRateLimited(limit?.count)) return json({ error: 'Too many submissions. Please try again later.' }, 429)
    await env.DB.prepare(
      'INSERT INTO reviews (id, name, rating, review, project_reference, ip_hash) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(
      crypto.randomUUID(),
      parsed.data.name,
      parsed.data.rating,
      parsed.data.review,
      parsed.data.projectReference,
      reviewerIp,
    ).run()
    await env.DB.prepare(
      'INSERT INTO submission_limits (id, ip_hash, endpoint) VALUES (?, ?, ?)',
    ).bind(crypto.randomUUID(), reviewerIp, 'review').run()
    return json({ submitted: true }, 202)
  }

  if (path === 'enquiries' && request.method === 'POST') {
    if (!env.DB) return json({ error: 'Database unavailable' }, 503)
    const body = await request.json().catch(() => null)
    const parsed = enquiryInputSchema.safeParse(body)
    if (!parsed.success) return json({ error: 'Enquiry validation failed', issues: parsed.error.issues }, 400)
    if (parsed.data.website) return json({ received: true }, 202)
    const enquiryIp = await ipHash(request)
    const limit = await env.DB.prepare(
      "SELECT COUNT(*) count FROM submission_limits WHERE ip_hash=? AND endpoint='enquiry' AND created_at > datetime('now', '-1 hour')",
    ).bind(enquiryIp).first<{ count: number }>()
    if (isSubmissionRateLimited(limit?.count)) return json({ error: 'Too many submissions. Please try again later.' }, 429)
    await env.DB.prepare(
      'INSERT INTO enquiries (id, name, email, company, project_type, budget, description, preferred_contact, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(
      crypto.randomUUID(),
      parsed.data.name,
      parsed.data.email,
      parsed.data.company,
      parsed.data.projectType,
      parsed.data.budget || null,
      parsed.data.description,
      parsed.data.preferredContact,
      enquiryIp,
    ).run()
    await env.DB.prepare(
      'INSERT INTO submission_limits (id, ip_hash, endpoint) VALUES (?, ?, ?)',
    ).bind(crypto.randomUUID(), enquiryIp, 'enquiry').run()
    // Notification delivery is deliberately best-effort and occurs after durable storage.
    if (env.NOTIFICATION_WEBHOOK_URL) {
      await fetch(env.NOTIFICATION_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'enquiry', name: parsed.data.name, email: parsed.data.email }),
      }).catch(() => undefined)
    }
    return json({ received: true }, 202)
  }

  if (path === 'admin/status') {
    const auth = await requireSession(context)
    if (!auth.session) return auth.response!
    return json({ authenticated: true, githubLogin: auth.session.githubLogin, csrfToken: auth.session.csrfToken })
  }

  if (path === 'admin/logout' && request.method === 'POST') {
    const auth = await requireSession(context)
    if (!auth.session) return auth.response!
    const cookies = parseCookies(request.headers.get('Cookie'))
    const raw = cookies.get('__Host-sirbon_session')
    if (raw && env.DB) await env.DB.prepare('DELETE FROM auth_sessions WHERE session_hash=?').bind(await sha256(raw)).run()
    const headers = new Headers()
    headers.append('Set-Cookie', '__Host-sirbon_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0')
    headers.append('Set-Cookie', 'sirbon_csrf=; Path=/; Secure; SameSite=Strict; Max-Age=0')
    return json({ loggedOut: true }, 200, headers)
  }

  if (path.startsWith('admin/') && env.DB) {
    const auth = await requireSession(context)
    if (!auth.session) return auth.response!
    const db = env.DB

    if (path === 'admin/projects' && request.method === 'GET') {
      const result = await db.prepare('SELECT * FROM projects ORDER BY featured DESC, sort_order ASC, name ASC').all()
      return json({ projects: result.results || [] })
    }

    if (path === 'admin/projects/sync' && request.method === 'POST') {
      try {
        const result = await synchronizeRepositories(db, env, auth.session.githubLogin)
        return json(result)
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : 'Synchronization failed' }, 502)
      }
    }

    if (path.startsWith('admin/projects/') && request.method === 'PUT') {
      const slug = path.slice('admin/projects/'.length)
      const body = await request.json().catch(() => null)
      const parsed = projectUpdateSchema.safeParse(body)
      if (!parsed.success) return json({ error: 'Invalid project update', issues: parsed.error.issues }, 400)
      const existing = await db.prepare('SELECT slug FROM projects WHERE slug=?').bind(slug).first()
      if (!existing) return json({ error: 'Project not found' }, 404)
      await db.prepare(`
        UPDATE projects SET
          name=COALESCE(?, name),
          summary=COALESCE(?, summary),
          description=?,
          public_summary=?,
          public_description=?,
          public_name=?,
          demo_url=?,
          technologies=?,
          featured=?,
          published=?,
          excluded=?,
          sort_order=?,
          updated_at=CURRENT_TIMESTAMP
        WHERE slug=?
      `).bind(
        parsed.data.name ?? null,
        parsed.data.summary ?? null,
        parsed.data.description ?? null,
        parsed.data.publicSummary ?? null,
        parsed.data.publicDescription ?? null,
        parsed.data.publicName ?? null,
        parsed.data.demoUrl ?? null,
        JSON.stringify(parsed.data.technologies ?? []),
        parsed.data.featured ? 1 : 0,
        parsed.data.published ? 1 : 0,
        parsed.data.excluded ? 1 : 0,
        parsed.data.sortOrder,
        slug,
      ).run()
      return json({ updated: true })
    }

    if (path === 'admin/enquiries') {
      if (request.method === 'GET') {
        const result = await db.prepare('SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 200').all()
        return json({ enquiries: result.results || [] })
      }
      if (request.method === 'PATCH') {
        const body = await request.json().catch(() => null) as { id?: string; status?: string } | null
        if (!body?.id || !['new', 'read', 'archived'].includes(body.status || '')) return json({ error: 'Invalid enquiry update' }, 400)
        await db.prepare('UPDATE enquiries SET status=? WHERE id=?').bind(body.status, body.id).run()
        return json({ updated: true })
      }
    }

    if (path === 'admin/reviews') {
      if (request.method === 'GET') {
        const result = await db.prepare('SELECT * FROM reviews ORDER BY created_at DESC LIMIT 200').all()
        return json({ reviews: result.results || [] })
      }
      if (request.method === 'PATCH') {
        const body = await request.json().catch(() => null) as { id?: string; status?: string } | null
        if (!body?.id || !['approved', 'rejected', 'removed'].includes(body.status || '')) return json({ error: 'Invalid review update' }, 400)
        await db.prepare(
          'UPDATE reviews SET status=?, moderated_at=CURRENT_TIMESTAMP, moderated_by=? WHERE id=?',
        ).bind(body.status, auth.session.githubLogin, body.id).run()
        return json({ updated: true })
      }
    }

    if (path === 'admin/sync-history' && request.method === 'GET') {
      const result = await db.prepare('SELECT * FROM repository_sync_history ORDER BY started_at DESC LIMIT 20').all()
      return json({ history: result.results || [] })
    }

    if (path === 'admin/settings' && (request.method === 'GET' || request.method === 'PUT')) {
      if (request.method === 'GET') {
        const result = await db.prepare('SELECT key, value FROM site_settings').all()
        return json({ settings: Object.fromEntries((result.results || []).map((row) => [row.key, row.value])) })
      }
      const body = await request.json().catch(() => null) as Record<string, unknown> | null
      if (!body) return json({ error: 'Invalid settings' }, 400)
      const statements = Object.entries(body)
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
        .slice(0, 50)
        .map(([key, value]) => db.prepare(
          'INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP',
        ).bind(key, value))
      if (statements.length) await db.batch(statements)
      return json({ updated: true })
    }

    if (path === 'admin/overview') {
      const [projects, enquiries, reviews, sync] = await db.batch([
        db.prepare('SELECT COUNT(*) count FROM projects'),
        db.prepare("SELECT COUNT(*) count FROM enquiries WHERE status='new'"),
        db.prepare("SELECT COUNT(*) count FROM reviews WHERE status='pending'"),
        db.prepare('SELECT * FROM repository_sync_history ORDER BY started_at DESC LIMIT 1'),
      ])
      return json({
        projectCount: (projects.results?.[0] as { count?: number } | undefined)?.count || 0,
        newEnquiryCount: (enquiries.results?.[0] as { count?: number } | undefined)?.count || 0,
        pendingReviewCount: (reviews.results?.[0] as { count?: number } | undefined)?.count || 0,
        lastSync: sync.results?.[0] || null,
      })
    }
  }

  return json({ error: 'Not found' }, 404)
}
