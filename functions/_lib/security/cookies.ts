export const SESSION_COOKIE_HTTPS = '__Host-sirbon_session'
export const SESSION_COOKIE_HTTP = 'sirbon_session'
export const OAUTH_COOKIE_HTTPS = '__Host-sirbon_oauth'
export const OAUTH_COOKIE_HTTP = 'sirbon_oauth'
export const CSRF_COOKIE_NAME = 'sirbon_csrf'

export function parseCookies(header: string | null): Map<string, string> {
  const result = new Map<string, string>()
  for (const part of (header || '').split(';')) {
    const index = part.indexOf('=')
    if (index > 0) {
      const name = part.slice(0, index).trim()
      const rawValue = part.slice(index + 1).trim()
      try {
        result.set(name, decodeURIComponent(rawValue))
      } catch {
        result.set(name, rawValue)
      }
    }
  }
  return result
}

export function cookieSecurityAttributes(request: Request) {
  const protocol = new URL(request.url).protocol
  const isSecure = protocol === 'https:'
  return {
    isSecure,
    sessionName: isSecure ? SESSION_COOKIE_HTTPS : SESSION_COOKIE_HTTP,
    oauthName: isSecure ? OAUTH_COOKIE_HTTPS : OAUTH_COOKIE_HTTP,
    secureFlag: isSecure ? '; Secure' : '',
  }
}

export function readSessionCookie(cookies: Map<string, string>): string | undefined {
  return cookies.get(SESSION_COOKIE_HTTPS) || cookies.get(SESSION_COOKIE_HTTP)
}

export function readOAuthCookie(cookies: Map<string, string>): string | undefined {
  return cookies.get(OAUTH_COOKIE_HTTPS) || cookies.get(OAUTH_COOKIE_HTTP)
}

export function buildOAuthStateCookie(request: Request, state: string): string {
  const { oauthName, secureFlag } = cookieSecurityAttributes(request)
  // RFC 6265bis: __Host- cookies require Path=/ and no Domain attribute.
  return `${oauthName}=${encodeURIComponent(state)}; Path=/; HttpOnly${secureFlag}; SameSite=Lax; Max-Age=600`
}

export function clearOAuthStateCookie(request: Request): string {
  const { oauthName, secureFlag } = cookieSecurityAttributes(request)
  return `${oauthName}=; Path=/; HttpOnly${secureFlag}; SameSite=Lax; Max-Age=0`
}

export function buildAuthSessionCookies(request: Request, rawSession: string, csrfToken: string): string[] {
  const { sessionName, secureFlag } = cookieSecurityAttributes(request)
  return [
    `${sessionName}=${encodeURIComponent(rawSession)}; Path=/; HttpOnly${secureFlag}; SameSite=Strict; Max-Age=43200`,
    `${CSRF_COOKIE_NAME}=${encodeURIComponent(csrfToken)}; Path=/${secureFlag}; SameSite=Strict; Max-Age=43200`,
  ]
}

export function clearAuthSessionCookies(request: Request): string[] {
  const { sessionName, secureFlag } = cookieSecurityAttributes(request)
  return [
    `${sessionName}=; Path=/; HttpOnly${secureFlag}; SameSite=Strict; Max-Age=0`,
    `${CSRF_COOKIE_NAME}=; Path=/${secureFlag}; SameSite=Strict; Max-Age=0`,
  ]
}
