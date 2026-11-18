# Sirbon.dev

React/TypeScript portfolio for Sirbon.dev, with Cloudflare Pages Functions-compatible APIs and D1 support.

## Development

```sh
npm install
npm run dev
```

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run check:config
```

## Cloudflare setup

The repository intentionally contains no account credentials or deployment configuration with a real database ID.

1. Create a D1 database and set it to the `DB` binding.
2. Set `D1_DATABASE` locally or replace the placeholder `database_id` in `wrangler.toml`.
3. Configure a GitHub App for public metadata only if repository integration is needed.
4. Set `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_PRIVATE_KEY`, and `ADMIN_ACCESS_TOKEN` as Cloudflare secrets.
5. Run migrations: `npx wrangler d1 migrations apply sirbon --remote`.

Private repository data must never be sent through public APIs or included in static frontend bundles.
