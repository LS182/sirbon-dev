const requiredForDeploy = [
  ['D1_DATABASE', 'Cloudflare Pages D1 binding named DB (database: sirbon)'],
  ['GITHUB_APP_CLIENT_ID', 'GitHub OAuth / App client ID'],
  ['GITHUB_APP_CLIENT_SECRET', 'GitHub OAuth / App client secret'],
  ['ADMIN_GITHUB_ACCOUNT_ID', 'Immutable numeric GitHub account ID for the administrator'],
  ['APP_ORIGIN', 'Canonical deployed origin (e.g. https://sirbon.dev)'],
]

const optionalIntegrations = [
  ['GITHUB_APP_PRIVATE_KEY', 'GitHub App RSA private key PEM (PKCS#1 or PKCS#8) for private repository sync'],
  ['GITHUB_APP_INSTALLATION_ID', 'GitHub App installation ID for private repository sync'],
  ['NOTIFICATION_WEBHOOK_URL', 'Webhook endpoint for best-effort enquiry notifications'],
]

console.log('Required Cloudflare Pages configuration:')
let missing = 0
for (const [name, description] of requiredForDeploy) {
  if (!process.env[name]) {
    console.log(`  [missing] ${name} — ${description}`)
    missing++
  } else {
    console.log(`  [set]     ${name}`)
  }
}

console.log('\nOptional integrations:')
for (const [name, description] of optionalIntegrations) {
  if (!process.env[name]) {
    console.log(`  [unset]   ${name} — ${description}`)
  } else {
    console.log(`  [set]     ${name}`)
  }
}

if (missing) process.exitCode = 1
