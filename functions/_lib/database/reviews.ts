import type { ReviewInput } from '../../../shared/schemas'
import type { ReviewRow } from './types'

export async function listApprovedReviews(db: D1Database) {
  const result = await db.prepare(
    'SELECT id, name, rating, review, project_reference, created_at FROM reviews WHERE status = ? ORDER BY created_at DESC LIMIT 50',
  ).bind('approved').all<ReviewRow>()
  return result.results || []
}

export async function createReview(db: D1Database, data: ReviewInput, ipHashValue: string): Promise<void> {
  await db.prepare(
    'INSERT INTO reviews (id, name, rating, review, project_reference, ip_hash) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(
    crypto.randomUUID(),
    data.name,
    data.rating,
    data.review,
    data.projectReference,
    ipHashValue,
  ).run()
}

export async function listAdminReviews(db: D1Database) {
  const result = await db.prepare(
    'SELECT * FROM reviews ORDER BY created_at DESC LIMIT 200',
  ).all<ReviewRow>()
  return result.results || []
}

export async function moderateReview(
  db: D1Database,
  id: string,
  status: 'approved' | 'rejected' | 'removed',
  moderatorLogin: string,
): Promise<void> {
  await db.prepare(
    'UPDATE reviews SET status = ?, moderated_at = CURRENT_TIMESTAMP, moderated_by = ? WHERE id = ?',
  ).bind(status, moderatorLogin, id).run()
}
