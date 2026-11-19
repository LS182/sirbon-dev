const requiredForDeploy = [
  ['D1_DATABASE', 'binding named DB'],
  ['GITHUB_APP_CLIENT_ID', 'GitHub OAuth/App client ID'],
  ['GITHUB_APP_CLIENT_SECRET', 'GitHub OAuth/App client secret'],
  ['ADMIN_GITHUB_ACCOUNT_ID', 'immutable GitHub administrator account ID'],
]

let missing = 0
for (const [name, description] of requiredForDeploy) {
  if (!process.env[name]) {
    console.log(`[missing] ${name}: ${description}`)
    missing++
  } else {
    console.log(`[set] ${name}`)
  }
}
if (missing) process.exitCode = 1
