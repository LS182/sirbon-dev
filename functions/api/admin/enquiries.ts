import { enquiryStatusUpdateSchema } from '../../../shared/schemas'
import { requireSession } from '../../_lib/auth/session'
import type { Env } from '../../_lib/config/env'
import { listAdminEnquiries, updateEnquiryStatus } from '../../_lib/database/enquiries'
import { json, methodNotAllowed } from '../../_lib/http/response'

export const onRequest: PagesFunction<Env> = async (context) => {
  const auth = await requireSession(context)
  if (!auth.session) return auth.response!
  if (!context.env.DB) return json({ error: 'Database unavailable' }, 503)

  if (context.request.method === 'GET' || context.request.method === 'HEAD') {
    const enquiries = await listAdminEnquiries(context.env.DB)
    return json({ enquiries })
  }

  if (context.request.method === 'PATCH') {
    const body = await context.request.json().catch(() => null)
    const parsed = enquiryStatusUpdateSchema.safeParse(body)
    if (!parsed.success) return json({ error: 'Invalid enquiry update' }, 400)

    await updateEnquiryStatus(context.env.DB, parsed.data.id, parsed.data.status)
    return json({ updated: true })
  }

  return methodNotAllowed(['GET', 'HEAD', 'PATCH'])
}
