import { requireSession } from '../../../_lib/auth/session'
import type { Env } from '../../../_lib/config/env'
import { listAdminProjects } from '../../../_lib/database/projects'
import { getLatestSync } from '../../../_lib/database/syncHistory'
import { ensureRepositoriesFresh } from '../../../_lib/github/sync'
import { json, methodNotAllowed } from '../../../_lib/http/response'

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    return methodNotAllowed(['GET', 'HEAD'])
  }
  const auth = await requireSession(context)
  if (!auth.session) return auth.response!
  if (!context.env.DB) return json({ error: 'Database unavailable' }, 503)

  const url = new URL(context.request.url)
  const skipAutoSync = url.searchParams.get('autoSync') === 'false'

  const syncMeta = skipAutoSync
    ? {
        autoSynced: false,
        syncSummary: null,
        syncWarning: null,
        lastSync: await getLatestSync(context.env.DB),
      }
    : await ensureRepositoriesFresh(context.env.DB, context.env, auth.session.githubLogin)

  const projects = await listAdminProjects(context.env.DB)
  return json({
    projects,
    autoSynced: syncMeta.autoSynced,
    syncSummary: syncMeta.syncSummary,
    syncWarning: syncMeta.syncWarning,
    lastSync: syncMeta.lastSync,
  })
}
