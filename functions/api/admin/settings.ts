import { requireSession } from '../../_lib/auth/session'
import type { Env } from '../../_lib/config/env'
import { getSiteSettings, upsertSiteSettings } from '../../_lib/database/settings'
import { json, methodNotAllowed } from '../../_lib/http/response'

export const onRequest: PagesFunction<Env> = async (context) => {
  const auth = await requireSession(context)
  if (!auth.session) return auth.response!
  if (!context.env.DB) return json({ error: 'Database unavailable' }, 503)

  if (context.request.method === 'GET' || context.request.method === 'HEAD') {
    const settings = await getSiteSettings(context.env.DB)
    return json({ settings })
  }

  if (context.request.method === 'PUT') {
    const body = await context.request.json().catch(() => null) as Record<string, unknown> | null
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return json({ error: 'Invalid settings' }, 400)
    }

    const entries = Object.entries(body)
      .filter((entry): entry is [string, string] => (
        typeof entry[0] === 'string'
        && /^[a-z0-9_.-]{1,80}$/i.test(entry[0])
        && typeof entry[1] === 'string'
        && entry[1].length <= 4000
      ))
      .slice(0, 50)

    await upsertSiteSettings(context.env.DB, entries)
    return json({ updated: true })
  }

  return methodNotAllowed(['GET', 'HEAD', 'PUT'])
}
