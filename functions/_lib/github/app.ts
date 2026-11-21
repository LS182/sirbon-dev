import type { Env } from '../config/env'

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function encodeJsonBase64Url(value: object): string {
  return encodeBase64Url(new TextEncoder().encode(JSON.stringify(value)))
}

function encodeDerLength(length: number): number[] {
  if (length < 0x80) return [length]
  const bytes: number[] = []
  let remaining = length
  while (remaining > 0) {
    bytes.unshift(remaining & 0xff)
    remaining >>= 8
  }
  return [0x80 | bytes.length, ...bytes]
}

/**
 * GitHub Apps generate RSA private keys in PKCS#1 format (`BEGIN RSA PRIVATE KEY`).
 * WebCrypto's `crypto.subtle.importKey('pkcs8', ...)` requires PKCS#8 (`BEGIN PRIVATE KEY`).
 * Wrapping PKCS#1 DER bytes in a standard RFC 5208 PrivateKeyInfo ASN.1 envelope allows
 * both formats to work seamlessly in Cloudflare Workers without manual OpenSSL conversion.
 */
export function wrapPkcs1InPkcs8(pkcs1Der: Uint8Array): Uint8Array {
  const version = [0x02, 0x01, 0x00]
  // AlgorithmIdentifier: rsaEncryption OID (1.2.840.113549.1.1.1) + NULL
  const algorithmId = [
    0x30, 0x0d,
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
    0x05, 0x00,
  ]
  const octetHeader = [0x04, ...encodeDerLength(pkcs1Der.length)]
  const innerLength = version.length + algorithmId.length + octetHeader.length + pkcs1Der.length
  const sequenceHeader = [0x30, ...encodeDerLength(innerLength)]

  const result = new Uint8Array(sequenceHeader.length + innerLength)
  let offset = 0
  for (const part of [sequenceHeader, version, algorithmId, octetHeader]) {
    result.set(part, offset)
    offset += part.length
  }
  result.set(pkcs1Der, offset)
  return result
}

export async function importGitHubAppPrivateKey(pem: string): Promise<CryptoKey> {
  const unescaped = pem.replace(/\\n/g, '\n').trim()
  const isPkcs1 = /-----BEGIN RSA PRIVATE KEY-----/.test(unescaped)
  const base64 = unescaped
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')

  const binary = atob(base64)
  const rawBytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  const pkcs8Bytes = isPkcs1 ? wrapPkcs1InPkcs8(rawBytes) : rawBytes
  const keyBuffer = pkcs8Bytes.buffer.slice(pkcs8Bytes.byteOffset, pkcs8Bytes.byteOffset + pkcs8Bytes.byteLength) as ArrayBuffer

  return crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

export async function createGitHubAppJwt(
  issuer: string,
  privateKeyPem: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<string> {
  const header = encodeJsonBase64Url({ alg: 'RS256', typ: 'JWT' })
  const payload = encodeJsonBase64Url({
    iat: nowSeconds - 60,
    exp: nowSeconds + 540,
    iss: issuer,
  })
  const signingInput = `${header}.${payload}`
  const key = await importGitHubAppPrivateKey(privateKeyPem)
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput),
  )
  return `${signingInput}.${encodeBase64Url(new Uint8Array(signature))}`
}

export interface InstallationToken {
  token: string
  expiresAt?: string
}

export async function requestGitHubInstallationToken(env: Env): Promise<InstallationToken | null> {
  const issuer = env.GITHUB_APP_ID || env.GITHUB_APP_CLIENT_ID
  if (!env.GITHUB_APP_PRIVATE_KEY || !env.GITHUB_APP_INSTALLATION_ID || !issuer) {
    return null
  }

  const appJwt = await createGitHubAppJwt(issuer, env.GITHUB_APP_PRIVATE_KEY)
  const response = await fetch(
    `https://api.github.com/app/installations/${encodeURIComponent(env.GITHUB_APP_INSTALLATION_ID)}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${appJwt}`,
        'User-Agent': 'sirbon-dev',
      },
    },
  )

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(`GitHub App authentication rejected (${response.status})`)
    }
    throw new Error(`GitHub installation token request failed (${response.status})`)
  }

  const result = await response.json() as { token?: string; expires_at?: string }
  if (!result.token) return null

  return {
    token: result.token,
    expiresAt: result.expires_at,
  }
}
