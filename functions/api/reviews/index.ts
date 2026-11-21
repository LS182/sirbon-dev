import { reviewInputSchema } from '../../../shared/schemas'
import type { Env } from '../../_lib/config/env'
import { countRecentSubmissions, isSubmissionRateLimited, recordSubmission } from '../../_lib/database/rateLimit'
import { createReview, listApprovedReviews } from '../../_lib/database/reviews'
import { ipHash, isPayloadTooLarge } from '../../_lib/http/origin'
import { json, methodNotAllowed } from '../../_lib/http/response'

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method === 'GET' || request.method === 'HEAD') {
    if (!env.DB) return json({ reviews: [] })
    try {
      const reviews = await listApprovedReviews(env.DB)
      return json({ reviews })
    } catch {
      return json({ error: 'Reviews unavailable' }, 503)
    }
  }

  if (request.method === 'POST') {
    if (!env.DB) return json({ error: 'Database unavailable' }, 503)
    if (isPayloadTooLarge(request, 32768)) return json({ error: 'Payload too large' }, 413)

    const body = await request.json().catch(() => null)
    const parsed = reviewInputSchema.safeParse(body)
    if (!parsed.success) {
      return json({ error: 'Review validation failed', issues: parsed.error.issues }, 400)
    }
    if (parsed.data.website) return json({ submitted: true }, 202)

    const reviewerIp = await ipHash(request)
    const count = await countRecentSubmissions(env.DB, reviewerIp, 'review')
    if (isSubmissionRateLimited(count)) {
      return json({ error: 'Too many submissions. Please try again later.' }, 429)
    }

    await createReview(env.DB, parsed.data, reviewerIp)
    await recordSubmission(env.DB, reviewerIp, 'review')
    return json({ submitted: true }, 202)
  }

  return methodNotAllowed(['GET', 'HEAD', 'POST'])
}
