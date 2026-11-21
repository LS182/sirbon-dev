import type { Env } from '../_lib/config/env'
import { json } from '../_lib/http/response'

/**
 * Catch-all fallback for unmatched /api/* routes so Cloudflare Pages returns
 * a JSON 404 rather than falling through to the static SPA index.html.
 */
export const onRequest: PagesFunction<Env> = async () => {
  return json({ error: 'Not found' }, 404)
}
