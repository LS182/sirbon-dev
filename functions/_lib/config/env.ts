export interface Env {
  DB?: D1Database
  GITHUB_APP_CLIENT_ID?: string
  GITHUB_APP_CLIENT_SECRET?: string
  GITHUB_APP_PRIVATE_KEY?: string
  GITHUB_APP_INSTALLATION_ID?: string
  GITHUB_APP_ID?: string
  ADMIN_GITHUB_ACCOUNT_ID?: string
  SESSION_SECRET?: string
  APP_ORIGIN?: string
  NOTIFICATION_WEBHOOK_URL?: string
}

export const GITHUB_ORG = 'LS182'

export function getConfigStatus(env: Env) {
  const d1Configured = Boolean(env.DB)
  const oauthConfigured = Boolean(env.GITHUB_APP_CLIENT_ID && env.GITHUB_APP_CLIENT_SECRET)
  const adminAllowlistConfigured = Boolean(env.ADMIN_GITHUB_ACCOUNT_ID?.trim())
  const appInstallationConfigured = Boolean(
    env.GITHUB_APP_PRIVATE_KEY
    && env.GITHUB_APP_INSTALLATION_ID
    && (env.GITHUB_APP_ID || env.GITHUB_APP_CLIENT_ID),
  )

  return {
    d1Configured,
    oauthConfigured,
    adminAllowlistConfigured,
    appInstallationConfigured,
    notificationWebhookConfigured: Boolean(env.NOTIFICATION_WEBHOOK_URL),
    appOriginConfigured: Boolean(env.APP_ORIGIN),
  }
}
