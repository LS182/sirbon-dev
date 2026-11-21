import { performLogout } from '../../_lib/auth/session'
import type { Env } from '../../_lib/config/env'
import { methodNotAllowed } from '../../_lib/http/response'

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method !== 'POST') {
    return methodNotAllowed(['POST'])
  }
  return performLogout(context)
}
