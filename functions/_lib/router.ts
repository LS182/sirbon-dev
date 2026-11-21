import { onRequest as middleware } from '../api/_middleware'
import { onRequest as catchall } from '../api/[[catchall]]'
import { onRequest as adminEnquiries } from '../api/admin/enquiries'
import { onRequest as adminLogout } from '../api/admin/logout'
import { onRequest as adminOverview } from '../api/admin/overview'
import { onRequest as adminProjectSlug } from '../api/admin/projects/[slug]'
import { onRequest as adminProjectsIndex } from '../api/admin/projects/index'
import { onRequest as adminProjectsSync } from '../api/admin/projects/sync'
import { onRequest as adminReviews } from '../api/admin/reviews'
import { onRequest as adminSettings } from '../api/admin/settings'
import { onRequest as adminStatus } from '../api/admin/status'
import { onRequest as adminSyncHistory } from '../api/admin/sync-history'
import { onRequest as authGithubCallback } from '../api/auth/github/callback'
import { onRequest as authGithubIndex } from '../api/auth/github/index'
import { onRequest as authLogout } from '../api/auth/logout'
import { onRequest as enquiriesIndex } from '../api/enquiries/index'
import { onRequest as githubStatus } from '../api/github/status'
import { onRequest as health } from '../api/health'
import { onRequest as projectSlug } from '../api/projects/[slug]'
import { onRequest as projectsIndex } from '../api/projects/index'
import { onRequest as reviewsIndex } from '../api/reviews/index'
import type { Env } from './config/env'

function resolveApiHandler(pathname: string): {
  handler: PagesFunction<Env>
  params: Record<string, string>
} {
  const path = pathname.replace(/^\/api\/?/, '').replace(/\/$/, '')

  switch (path) {
    case 'health':
      return { handler: health, params: {} }
    case 'github/status':
      return { handler: githubStatus, params: {} }
    case 'auth/github':
      return { handler: authGithubIndex, params: {} }
    case 'auth/github/callback':
      return { handler: authGithubCallback, params: {} }
    case 'auth/logout':
      return { handler: authLogout, params: {} }
    case 'projects':
      return { handler: projectsIndex, params: {} }
    case 'reviews':
      return { handler: reviewsIndex, params: {} }
    case 'enquiries':
      return { handler: enquiriesIndex, params: {} }
    case 'admin/status':
      return { handler: adminStatus, params: {} }
    case 'admin/logout':
      return { handler: adminLogout, params: {} }
    case 'admin/overview':
      return { handler: adminOverview, params: {} }
    case 'admin/projects':
      return { handler: adminProjectsIndex, params: {} }
    case 'admin/projects/sync':
      return { handler: adminProjectsSync, params: {} }
    case 'admin/sync-history':
      return { handler: adminSyncHistory, params: {} }
    case 'admin/enquiries':
      return { handler: adminEnquiries, params: {} }
    case 'admin/reviews':
      return { handler: adminReviews, params: {} }
    case 'admin/settings':
      return { handler: adminSettings, params: {} }
    default:
      break
  }

  if (path.startsWith('projects/') && !path.slice('projects/'.length).includes('/')) {
    return { handler: projectSlug, params: { slug: path.slice('projects/'.length) } }
  }

  if (path.startsWith('admin/projects/') && !path.slice('admin/projects/'.length).includes('/')) {
    return { handler: adminProjectSlug, params: { slug: path.slice('admin/projects/'.length) } }
  }

  return { handler: catchall, params: {} }
}

/**
 * Local Vite dev & test dispatcher that mirrors Cloudflare Pages Functions
 * middleware + file-based routing behavior identically.
 */
export async function dispatchApiRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const { handler, params } = resolveApiHandler(url.pathname)

  const routeContext: PagesContext<Env> = {
    request,
    env,
    params,
    next: async () => new Response('Not found', { status: 404 }),
  }

  return middleware({
    request,
    env,
    params,
    next: () => Promise.resolve(handler(routeContext)),
  })
}
