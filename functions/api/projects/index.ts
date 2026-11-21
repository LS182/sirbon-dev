import type { Env } from '../../_lib/config/env'
import { listPublicProjects } from '../../_lib/database/projects'
import { json, methodNotAllowed } from '../../_lib/http/response'

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return methodNotAllowed(['GET', 'HEAD'])
  }
  if (!env.DB) return json({ projects: [] })

  try {
    const projects = await listPublicProjects(env.DB)
    return json({ projects })
  } catch {
    return json({ error: 'Projects unavailable' }, 503)
  }
}
