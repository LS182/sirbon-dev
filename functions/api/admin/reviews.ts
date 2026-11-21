import { reviewModerationSchema } from '../../../shared/schemas'
import { requireSession } from '../../_lib/auth/session'
import type { Env } from '../../_lib/config/env'
import { listAdminReviews, moderateReview } from '../../_lib/database/reviews'
import { json, methodNotAllowed } from '../../_lib/http/response'

export const onRequest: PagesFunction<Env> = async (context) => {
  const auth = await requireSession(context)
  if (!auth.session) return auth.response!
  if (!context.env.DB) return json({ error: 'Database unavailable' }, 503)

  if (context.request.method === 'GET' || context.request.method === 'HEAD') {
    const reviews = await listAdminReviews(context.env.DB)
    return json({ reviews })
  }

  if (context.request.method === 'PATCH') {
    const body = await context.request.json().catch(() => null)
    const parsed = reviewModerationSchema.safeParse(body)
    if (!parsed.success) return json({ error: 'Invalid review update' }, 400)

    await moderateReview(context.env.DB, parsed.data.id, parsed.data.status, auth.session.githubLogin)
    return json({ updated: true })
  }

  return methodNotAllowed(['GET', 'HEAD', 'PATCH'])
}
