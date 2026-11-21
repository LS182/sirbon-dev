import type { Env } from '../functions/_lib/config/env'
import { dispatchApiRequest } from '../functions/_lib/router'

export interface WorkerEnv extends Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>
  }
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return dispatchApiRequest(request, env)
    }
    return env.ASSETS.fetch(request)
  },
}
