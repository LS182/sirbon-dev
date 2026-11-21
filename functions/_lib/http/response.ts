export const securityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), focus-without-user-activation=()',
  'Vary': 'Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site',
}

const jsonHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  ...securityHeaders,
}

export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  const responseHeaders = new Headers(jsonHeaders)
  const extra = new Headers(headers)
  extra.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      responseHeaders.append(key, value)
    } else {
      responseHeaders.set(key, value)
    }
  })
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders,
  })
}

export function methodNotAllowed(allowed: string[]): Response {
  return json(
    { error: 'Method not allowed' },
    405,
    { Allow: allowed.join(', ') },
  )
}

export function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({
    ...securityHeaders,
    Location: location,
    'Cache-Control': 'no-store',
  })
  for (const cookie of cookies) {
    headers.append('Set-Cookie', cookie)
  }
  return new Response(null, { status: 302, headers })
}
