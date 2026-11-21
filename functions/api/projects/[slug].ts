import type { Env } from '../../_lib/config/env'
import { findPublicProjectBySlug } from '../../_lib/database/projects'
import { json, methodNotAllowed } from '../../_lib/http/response'

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return methodNotAllowed(['GET', 'HEAD'])
  }
  const slug = String(params.slug || '').trim()
  if (!slug || !env.DB) return json({ error: 'Not found' }, 404)

  try {
    const project = await findPublicProjectBySlug(env.DB, slug)
    if (!project) return json({ error: 'Not found' }, 404)
    return json({ project })
  } catch {
    return json({ error: 'Project unavailable' }, 503)
  }
}
