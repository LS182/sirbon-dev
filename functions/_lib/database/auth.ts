import type { AuthSessionRow } from './types'

export async function saveOAuthState(db: D1Database, stateHash: string): Promise<void> {
  await db.prepare(
    "INSERT INTO oauth_states (state_hash, expires_at) VALUES (?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+10 minutes'))",
  ).bind(stateHash).run()
  await db.prepare(
    "DELETE FROM oauth_states WHERE expires_at < strftime('%Y-%m-%dT%H:%M:%SZ', 'now')",
  ).run()
}

export async function consumeOAuthState(db: D1Database, stateHash: string): Promise<{ expires_at: string } | null> {
  const row = await db.prepare(
    'SELECT expires_at FROM oauth_states WHERE state_hash = ?',
  ).bind(stateHash).first<{ expires_at: string }>()
  await db.prepare('DELETE FROM oauth_states WHERE state_hash = ?').bind(stateHash).run()
  return row
}

export async function upsertAdministrator(db: D1Database, accountId: string, login: string): Promise<void> {
  await db.prepare(`
    INSERT INTO administrators (github_account_id, github_login)
    VALUES (?, ?)
    ON CONFLICT(github_account_id) DO UPDATE SET
      github_login = excluded.github_login,
      updated_at = CURRENT_TIMESTAMP
  `).bind(accountId, login).run()
}

export async function replaceAdminSession(
  db: D1Database,
  params: {
    sessionHash: string
    csrfHash: string
    accountId: string
    login: string
  },
): Promise<void> {
  await db.prepare('DELETE FROM auth_sessions WHERE github_account_id = ?').bind(params.accountId).run()
  await db.prepare(`
    INSERT INTO auth_sessions (id, session_hash, csrf_hash, github_account_id, github_login, expires_at)
    VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+12 hours'))
  `).bind(
    crypto.randomUUID(),
    params.sessionHash,
    params.csrfHash,
    params.accountId,
    params.login,
  ).run()
  await db.prepare(
    "DELETE FROM auth_sessions WHERE expires_at < strftime('%Y-%m-%dT%H:%M:%SZ', 'now')",
  ).run()
}

export async function findSessionByHash(db: D1Database, sessionHash: string): Promise<AuthSessionRow | null> {
  return db.prepare(
    'SELECT github_account_id, github_login, csrf_hash, expires_at FROM auth_sessions WHERE session_hash = ?',
  ).bind(sessionHash).first<AuthSessionRow>()
}

export async function deleteSessionByHash(db: D1Database, sessionHash: string): Promise<void> {
  await db.prepare('DELETE FROM auth_sessions WHERE session_hash = ?').bind(sessionHash).run()
}
