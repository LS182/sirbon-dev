export async function getSiteSettings(db: D1Database): Promise<Record<string, string>> {
  const result = await db.prepare('SELECT key, value FROM site_settings').all<{ key: string; value: string }>()
  return Object.fromEntries((result.results || []).map((row) => [row.key, row.value]))
}

export async function upsertSiteSettings(db: D1Database, entries: Array<[string, string]>): Promise<void> {
  const statements = entries.map(([key, value]) =>
    db.prepare(`
      INSERT INTO site_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `).bind(key, value),
  )
  if (statements.length) {
    await db.batch(statements)
  }
}
