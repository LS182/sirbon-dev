import { requireSession } from '../../../_lib/auth/session'
import type { Env } from '../../../_lib/config/env'
import { synchronizeRepositories } from '../../../_lib/github/sync'
import { json, methodNotAllowed } from '../../../_lib/http/response'

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method !== 'POST') {
    return methodNotAllowed(['POST'])
  }
  const auth = await requireSession(context)
  if (!auth.session) return auth.response!
  if (!context.env.DB) return json({ error: 'Database unavailable' }, 503)

  try {
    const result = await synchronizeRepositories(context.env.DB, context.env, auth.session.githubLogin)
    return json(result)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Synchronization failed' }, 502)
  }
}
