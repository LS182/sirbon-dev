import type { Env } from '../_lib/config/env'
import { isAllowedFetchMetadata, validOrigin } from '../_lib/http/origin'
import { json, securityHeaders } from '../_lib/http/response'

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: securityHeaders })
  }

  if (!isAllowedFetchMetadata(request)) {
    return json({ error: 'Forbidden' }, 403)
  }

  if (request.method !== 'GET' && request.method !== 'HEAD' && !validOrigin(request, env)) {
    return json({ error: 'Invalid origin' }, 403)
  }

  try {
    return await context.next()
  } catch {
    return json({ error: 'Internal server error' }, 500)
  }
}
