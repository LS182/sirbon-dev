import { initiateGitHubOAuth } from '../../../_lib/auth/oauth'
import type { Env } from '../../../_lib/config/env'
import { methodNotAllowed } from '../../../_lib/http/response'

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'GET') {
    return methodNotAllowed(['GET'])
  }
  return initiateGitHubOAuth(request, env)
}
