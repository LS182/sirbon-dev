import { enquiryInputSchema } from '../../../shared/schemas'
import type { Env } from '../../_lib/config/env'
import { createEnquiry } from '../../_lib/database/enquiries'
import { countRecentSubmissions, isSubmissionRateLimited, recordSubmission } from '../../_lib/database/rateLimit'
import { ipHash, isPayloadTooLarge } from '../../_lib/http/origin'
import { json, methodNotAllowed } from '../../_lib/http/response'
import { sendEnquiryNotification } from '../../_lib/notifications/webhook'

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') {
    return methodNotAllowed(['POST'])
  }
  if (!env.DB) return json({ error: 'Database unavailable' }, 503)
  if (isPayloadTooLarge(request, 65536)) return json({ error: 'Payload too large' }, 413)

  const body = await request.json().catch(() => null)
  const parsed = enquiryInputSchema.safeParse(body)
  if (!parsed.success) {
    return json({ error: 'Enquiry validation failed', issues: parsed.error.issues }, 400)
  }
  if (parsed.data.website) return json({ received: true }, 202)

  const enquiryIp = await ipHash(request)
  const count = await countRecentSubmissions(env.DB, enquiryIp, 'enquiry')
  if (isSubmissionRateLimited(count)) {
    return json({ error: 'Too many submissions. Please try again later.' }, 429)
  }

  await createEnquiry(env.DB, parsed.data, enquiryIp)
  await recordSubmission(env.DB, enquiryIp, 'enquiry')
  await sendEnquiryNotification(env, {
    name: parsed.data.name,
    email: parsed.data.email,
    projectType: parsed.data.projectType,
  })

  return json({ received: true }, 202)
}
