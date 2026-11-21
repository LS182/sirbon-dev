import type { Env } from '../config/env'
import { sha256 } from '../security/crypto'

export function ipHash(request: Request): Promise<string> {
  const cfIp = request.headers.get('CF-Connecting-IP')?.trim()
  const forwarded = request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
  const ip = cfIp || forwarded || 'unknown'
  return sha256(ip)
}

export function resolveAppOrigin(request: Request, env: Env): string {
  const configured = env.APP_ORIGIN?.trim()
  if (configured) {
    try {
      return new URL(configured).origin
    } catch {
      // Fall back to request origin if APP_ORIGIN is malformed
    }
  }
  return new URL(request.url).origin
}

export function validOrigin(request: Request, env: Env): boolean {
  if (request.method === 'GET' || request.method === 'HEAD') return true
  const origin = request.headers.get('Origin')
  if (!origin) return false
  try {
    const supplied = new URL(origin)
    return supplied.origin === resolveAppOrigin(request, env)
  } catch {
    return false
  }
}

export function isAllowedFetchMetadata(request: Request): boolean {
  const site = request.headers.get('Sec-Fetch-Site')
  if (!site) return true

  if (site === 'same-origin' || site === 'none') return true

  const mode = request.headers.get('Sec-Fetch-Mode') || ''
  const dest = request.headers.get('Sec-Fetch-Dest') || ''

  // Allow standard top-level GET navigations (required for GitHub OAuth callbacks)
  if (site === 'cross-site' && mode === 'navigate' && request.method === 'GET' && !['object', 'embed'].includes(dest)) {
    return true
  }

  return false
}

export function isPayloadTooLarge(request: Request, maxBytes: number): boolean {
  const length = Number(request.headers.get('Content-Length') || 0)
  return Number.isFinite(length) && length > maxBytes
}
