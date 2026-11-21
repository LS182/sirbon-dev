export function isSubmissionRateLimited(count: number | undefined, limit = 5): boolean {
  return (count || 0) >= limit
}

export async function countRecentSubmissions(
  db: D1Database,
  ipHashValue: string,
  endpoint: 'review' | 'enquiry',
): Promise<number> {
  await db.prepare(
    "DELETE FROM submission_limits WHERE created_at < datetime('now', '-24 hours')",
  ).run().catch(() => undefined)

  const row = await db.prepare(
    "SELECT COUNT(*) count FROM submission_limits WHERE ip_hash = ? AND endpoint = ? AND created_at > datetime('now', '-1 hour')",
  ).bind(ipHashValue, endpoint).first<{ count: number }>()

  return row?.count || 0
}

export async function recordSubmission(
  db: D1Database,
  ipHashValue: string,
  endpoint: 'review' | 'enquiry',
): Promise<void> {
  await db.prepare(
    'INSERT INTO submission_limits (id, ip_hash, endpoint) VALUES (?, ?, ?)',
  ).bind(crypto.randomUUID(), ipHashValue, endpoint).run()
}
