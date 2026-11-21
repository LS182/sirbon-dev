import { getConfigStatus, type Env } from '../_lib/config/env'
import { json, methodNotAllowed } from '../_lib/http/response'

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return methodNotAllowed(['GET', 'HEAD'])
  }

  const status = getConfigStatus(env)
  return json({
    ok: true,
    d1: status.d1Configured,
    githubOAuthConfigured: status.oauthConfigured,
    githubAppConfigured: status.oauthConfigured,
    githubInstallationConfigured: status.appInstallationConfigured,
    adminAllowlistConfigured: status.adminAllowlistConfigured,
    notificationWebhookConfigured: status.notificationWebhookConfigured,
  })
}
