import type { EnquiryInput } from '../../../shared/schemas'
import type { EnquiryRow } from './types'

export async function createEnquiry(db: D1Database, data: EnquiryInput, ipHashValue: string): Promise<void> {
  const descriptionWithPhone = data.phone
    ? `${data.description}\n\n[Contact Phone: ${data.phone}]`
    : data.description

  await db.prepare(`
    INSERT INTO enquiries (
      id, name, email, company, project_type, budget, description, preferred_contact, ip_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    data.name,
    data.email,
    data.company,
    data.projectType,
    data.budget || null,
    descriptionWithPhone,
    data.preferredContact,
    ipHashValue,
  ).run()
}

export async function listAdminEnquiries(db: D1Database) {
  const result = await db.prepare(
    'SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 200',
  ).all<EnquiryRow>()
  return result.results || []
}

export async function updateEnquiryStatus(
  db: D1Database,
  id: string,
  status: 'new' | 'read' | 'archived',
): Promise<void> {
  await db.prepare('UPDATE enquiries SET status = ? WHERE id = ?').bind(status, id).run()
}
