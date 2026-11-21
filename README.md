# Sirbon.dev

Personal software engineering portfolio for Liam Victor Sirbon, built with React, TypeScript, Vite, Tailwind CSS v4, Cloudflare Pages Functions, and Cloudflare D1.

## Architecture

- **`src/app/`** — Application shell, routing (lazy-loaded admin routes), site config, and layout.
- **`src/features/`** — Self-contained feature modules (`home`, `about`, `experience`, `skills`, `services`, `projects`, `reviews`, `contact`, `auth`, `admin`, `not-found`).
- **`src/shared/`** — Shared API client, reusable UI primitives, hooks, utilities, and modular CSS design system (`tokens.css`, `base.css`, `layout.css`, `components.css`, `pages.css`).
- **`functions/api/`** — Thin Cloudflare Pages Functions file-based routes (`health`, `github/status`, `auth/*`, `projects/*`, `reviews`, `enquiries`, `admin/*`) plus `_middleware.ts` and `[[catchall]].ts`.
- **`functions/_lib/`** — Private backend modules excluded from public routing (`config`, `security`, `http`, `auth`, `github`, `database`, `notifications`, `router`).
- **`shared/schemas.ts`** — Shared Zod validation schemas used by frontend and backend.
- **`migrations/`** — Applied Cloudflare D1 SQL migrations (`0001_initial.sql`, `0002_portfolio_application.sql`) and `SCHEMA.md`.
- **`tests/`** — Unit and integration test suites (`content`, `security`, `github`, `api`).

## Local Development

```sh
npm install
npm run dev
```

Vite routes `/api/*` requests locally through `functions/_lib/router.ts` (mirroring Cloudflare Pages Functions middleware and routes).

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run check:config
```

## Cloudflare Pages & GitHub Setup

The repository contains no credentials or real database IDs. Configure the following in the **Cloudflare Pages Dashboard** (`sirbon-dev`):

1. **Build settings**:
   - Build command: `npm run build`
   - Build output directory: `dist`
2. **D1 Database binding** (Settings → Functions → D1 database bindings):
   - Variable name: `DB`
   - Database: `sirbon` (`0001_initial.sql` and `0002_portfolio_application.sql` already applied remotely)
3. **GitHub OAuth (Required for Admin Login)**:
   - Callback URL: `https://<your-domain>/api/auth/github/callback`
   - Scope requested: `read:user`
   - Secrets/Variables: `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `ADMIN_GITHUB_ACCOUNT_ID` (immutable numeric GitHub ID), `APP_ORIGIN`
4. **GitHub App Installation (Optional — for private repository discovery)**:
   - Secrets/Variables: `GITHUB_APP_PRIVATE_KEY` (PKCS#1 or PKCS#8 PEM), `GITHUB_APP_INSTALLATION_ID`
   - If omitted, synchronization gracefully falls back to public `LS182` repositories.
5. **Enquiry Notifications (Optional)**:
   - `NOTIFICATION_WEBHOOK_URL`

Private repository metadata, URLs, and READMEs are never exposed through public APIs or static bundles.
