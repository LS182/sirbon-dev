# Project Status

## Architecture & Completed Functionality

- **Feature-based frontend (`src/features/`, `src/app/`, `src/shared/`)**:
  - Dedicated feature modules for `home`, `about`, `experience`, `skills`, `services`, `projects`, `reviews`, `contact`, `auth`, `admin`, and `not-found`.
  - Code-split `/admin` and `/admin/dashboard` routes via `React.lazy`.
  - Modular CSS design system (`tokens.css`, `base.css`, `layout.css`, `components.css`, `pages.css`) using the Sirbon brand palette (`#5ba47a`, `#00a763`, `#eafef1`, `#1d1d35`) with WCAG AA+ contrast, `:focus-visible` outlines, skip links, and `prefers-reduced-motion` support.
- **Personal authenticity**:
  - Verified profile, CPUT education, student leadership, and technical skill groups for Liam Victor Sirbon (Cape Town).
  - StudentRent and Tee2Pin Dinner Club presented accurately as academic projects with purpose, problem, features, architecture, contributions, technical decisions, and lessons learned.
- **Modular Cloudflare Pages Functions backend (`functions/api/` + `functions/_lib/`)**:
  - File-based API routes under `functions/api/` protected by `functions/api/_middleware.ts` (OPTIONS, Fetch Metadata isolation, Origin checks, error boundary) and `functions/api/[[catchall]].ts` (404 JSON fallback).
  - Dedicated backend modules for D1 queries (`functions/_lib/database/`), GitHub OAuth (`functions/_lib/auth/`), GitHub App JWT/installation tokens & sync (`functions/_lib/github/`), security/cookies (`functions/_lib/security/`), and HTTP responses (`functions/_lib/http/`).
  - GitHub App RS256 JWT signing supports both PKCS#1 (`BEGIN RSA PRIVATE KEY`, GitHub's native format) and PKCS#8 (`BEGIN PRIVATE KEY`) PEM keys, including escaped `\n` newlines from dashboard secrets.
- **Security & Privacy**:
  - Immutable numeric GitHub account ID allowlisting (`ADMIN_GITHUB_ACCOUNT_ID`) with constant-time comparison.
  - Hashed single-use OAuth state, hashed server-side sessions, double-submit CSRF tokens, `Clear-Site-Data` + multi-cookie clearing on logout, and static + API security headers (`public/_headers`).
  - Private repository redaction enforced both at query time and on `PUT /api/admin/projects/:slug` (private repos require explicitly authored `publicName`, `publicSummary`, and `publicDescription` before publishing).

## Database Migrations

- Remote D1 database: `sirbon` (binding: `DB`).
- Applied migrations (unmodified):
  - `migrations/0001_initial.sql`
  - `migrations/0002_portfolio_application.sql`
- Schema reference documented in `migrations/SCHEMA.md`. No new migrations were required.

## Required Manual Configuration (Cloudflare Pages Dashboard)

1. Bind existing D1 database `sirbon` to binding name `DB` for Production and Preview environments.
2. Configure GitHub OAuth credentials:
   - `GITHUB_APP_CLIENT_ID`
   - `GITHUB_APP_CLIENT_SECRET`
   - `ADMIN_GITHUB_ACCOUNT_ID`
   - `APP_ORIGIN`
   - Ensure callback URL is set to `/api/auth/github/callback`.
3. Optionally configure GitHub App private repository sync:
   - `GITHUB_APP_PRIVATE_KEY`
   - `GITHUB_APP_INSTALLATION_ID`
4. Optionally configure `NOTIFICATION_WEBHOOK_URL` for best-effort enquiry alerts.
