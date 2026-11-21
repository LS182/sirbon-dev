import type { SyncHistoryRow } from './types'

export async function startSyncHistory(db: D1Database, syncId: string, initiatedBy: string): Promise<void> {
  await db.prepare(
    'INSERT INTO repository_sync_history (id, status, initiated_by) VALUES (?, ?, ?)',
  ).bind(syncId, 'running', initiatedBy).run()
}

export async function completeSyncHistory(
  db: D1Database,
  syncId: string,
  counts: { total: number; publicCount: number; privateCount: number },
): Promise<void> {
  await db.prepare(`
    UPDATE repository_sync_history
    SET completed_at = CURRENT_TIMESTAMP, status = ?, repository_count = ?, public_count = ?, private_count = ?
    WHERE id = ?
  `).bind('success', counts.total, counts.publicCount, counts.privateCount, syncId).run()
}

export async function failSyncHistory(db: D1Database, syncId: string, errorMessage: string): Promise<void> {
  await db.prepare(
    'UPDATE repository_sync_history SET completed_at = CURRENT_TIMESTAMP, status = ?, error_message = ? WHERE id = ?',
  ).bind('failed', errorMessage, syncId).run()
}

export async function getLatestSync(db: D1Database): Promise<SyncHistoryRow | null> {
  return db.prepare(
    'SELECT * FROM repository_sync_history ORDER BY started_at DESC LIMIT 1',
  ).first<SyncHistoryRow>()
}

export async function listSyncHistory(db: D1Database) {
  const result = await db.prepare(
    'SELECT * FROM repository_sync_history ORDER BY started_at DESC LIMIT 20',
  ).all<SyncHistoryRow>()
  return result.results || []
}

export async function getAdminOverviewStats(db: D1Database) {
  const [projects, enquiries, reviews, sync] = await db.batch([
    db.prepare('SELECT COUNT(*) count FROM projects'),
    db.prepare("SELECT COUNT(*) count FROM enquiries WHERE status = 'new'"),
    db.prepare("SELECT COUNT(*) count FROM reviews WHERE status = 'pending'"),
    db.prepare('SELECT * FROM repository_sync_history ORDER BY started_at DESC LIMIT 1'),
  ])

  return {
    projectCount: (projects.results?.[0] as { count?: number } | undefined)?.count || 0,
    newEnquiryCount: (enquiries.results?.[0] as { count?: number } | undefined)?.count || 0,
    pendingReviewCount: (reviews.results?.[0] as { count?: number } | undefined)?.count || 0,
    lastSync: ((sync.results?.[0] as unknown) as SyncHistoryRow | undefined) || null,
  }
}
