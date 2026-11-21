import { requireSession } from '../../../_lib/auth/session'
import type { Env } from '../../../_lib/config/env'
import { listAdminProjects } from '../../../_lib/database/projects'
import { json, methodNotAllowed } from '../../../_lib/http/response'

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    return methodNotAllowed(['GET', 'HEAD'])
  }
  const auth = await requireSession(context)
  if (!auth.session) return auth.response!
  if (!context.env.DB) return json({ error: 'Database unavailable' }, 503)

  const projects = await listAdminProjects(context.env.DB)
  return json({ projects })
}
