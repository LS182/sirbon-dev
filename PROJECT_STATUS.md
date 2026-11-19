# Project Status

## Completed functionality

- Personal identity and portfolio content for Liam Victor Sirbon, based in Cape Town.
- About, experience/education and categorized skills pages using only supplied, verifiable information.
- Maintained StudentRent and Tee2Pin Dinner Club as clearly labeled academic/group case studies with purpose, architecture, Liam's contributions and engineering decisions.
- Real-portrait placeholder with no stock or AI-generated image; project visual evidence is not fabricated.
- Added dedicated routes for `/about`, `/experience`, `/skills`, `/projects`, and `/contact`.

- Public React pages for home, projects, project details, about, services, reviews, contact and a custom 404.
- Public project data is fetched from the Pages API; production components no longer contain demonstration projects.
- Responsive premium portfolio styling using the Sirbon brand palette.
- GitHub repository discovery for the `LS182` organization, with public pagination and optional GitHub App installation access.
- Public repository metadata caching, README caching for public repositories, and manual administrator synchronization.
- Private repository protection: private metadata and repository URLs are excluded from public responses and private projects require approved public case-study fields.
- GitHub OAuth login with state cookies, callback validation, OAuth code exchange, immutable account-ID allowlisting and server-side sessions.
- Hashed session identifiers and CSRF tokens, HttpOnly/Secure/SameSite cookies, logout and protected independent admin endpoints.
- D1 models and API endpoints for projects, synchronization history, enquiries, reviews, administrators, sessions, OAuth states and settings.
- Contact and review submission with Zod validation, honeypot fields, moderation and durable database writes.
- D1-backed per-IP submission rate limits protect contact and review forms.
- Notification provider abstraction through `NOTIFICATION_WEBHOOK_URL`; notification failure does not remove a stored enquiry.
- Admin dashboard sections for overview, repositories, synchronization, enquiries, review moderation and settings.
- Project publishing, featuring, excluding and ordering controls.

## Pre-deployment audit verification

- Independently reviewed the OAuth/callback, session, CSRF, origin, public API, project synchronization and moderation paths.
- Verified both SQL migrations against an isolated SQLite database: `0001_initial.sql` and `0002_portfolio_application.sql` apply successfully.
- Fixed additive migration SQL typos that would have prevented `0002_portfolio_application.sql` from applying.
- Fixed session reuse: successful administrator OAuth now invalidates prior sessions for that immutable GitHub account ID before creating the replacement session.
- Fixed logout: `/api/auth/logout` and `/api/admin/logout` now require a valid session and CSRF and clear both session and CSRF cookies.
- Fixed private project publication: private projects now require administrator-authored `public_name`, `public_summary` and `public_description`; synchronized repository names cannot serve as the public name.
- Repository synchronization now unpublishes and excludes a newly private repository. It does not change publication decisions for a repository that remains public.
- Project mutation now uses a strict Zod update schema and rejects unknown/nonexistent project IDs with explicit validation responses.
- Public project and detail queries now return generic database-error responses instead of allowing implementation errors to escape.
- GitHub synchronization now returns explicit rate-limit/access-denied failures instead of generic fetch failures.
- 15 isolated tests pass without credentials or a Cloudflare account.

## Incomplete functionality

- GitHub App and D1 credentials are intentionally not configured.
- Private GitHub repository access is implemented only when installation credentials and an installation ID are supplied.
- README content is cached only for public repositories.
- Review and enquiry management are working through API-backed dashboard sections; richer editing and email templates remain optional.
- The settings section exposes the settings API but does not ship deployment-specific content fields.
- Production email delivery requires configuring `NOTIFICATION_WEBHOOK_URL`.

## Database migrations

- `migrations/0001_initial.sql` remains unchanged.
- `migrations/0002_portfolio_application.sql` adds additive project repository fields and tables for synchronization history, enquiries, reviews, administrators, sessions, OAuth states and site settings.

## Security decisions

- No static `ADMIN_ACCESS_TOKEN` authentication remains.
- GitHub users are authorized only by the exact immutable numeric account ID in `ADMIN_GITHUB_ACCOUNT_ID`.
- Browser-supplied usernames are never used for authorization.
- Session identifiers and CSRF values are stored or transmitted in hashed form as appropriate.
- OAuth state is random, hashed in D1, single-use and short-lived.
- Admin mutations require Origin and CSRF validation.
- Public API responses do not include private README, source, URL or private metadata.
- Private repositories default to unpublished and excluded from public listing.

## Required manual configuration

1. Create/configure D1 and set the `DB` binding.
2. Apply migrations to the target D1 database.
3. Create a GitHub OAuth App or GitHub App OAuth credentials and set the callback to `/api/auth/github/callback`.
4. Set `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_PRIVATE_KEY`, and optionally `GITHUB_APP_INSTALLATION_ID`.
5. Set `ADMIN_GITHUB_ACCOUNT_ID` to the administrator's immutable GitHub numeric ID.
6. Set `APP_ORIGIN` to the deployed origin.
7. Optionally set `NOTIFICATION_WEBHOOK_URL` for enquiry notifications.

## Tests executed

- `npm run typecheck`
- `npm run lint`
- `npm test` — 15 tests passed
- `npm run build`
- `npm install`
- `npm run check:config` is not expected to pass until deployment values are configured.

Tests cover immutable-ID authorization logic, OAuth/session hashing, session expiry, cookie parsing, unauthorized admin access, CSRF rejection, mismatched OAuth state, contact and review validation, project update validation, publishing/exclusion visibility, submission limits, private project metadata redaction and public GitHub pagination behavior.

## Known limitations

- No Cloudflare account, D1 database or GitHub credentials are configured or inferred.
- GitHub installation access is bounded to repositories exposed by the configured installation.
- Public repository names/descriptions can change when synchronization runs.
- Administrator-authored public summaries and descriptions must be supplied manually for private projects.
- The notification provider currently supports a webhook contract only; no SMTP or transactional email provider is bundled.
- Real GitHub OAuth, GitHub App installation access, private repository synchronization and D1 behavior have not been exercised with production credentials.
- Public and private repository API behavior is covered by isolated mocks and source-level isolation checks, not live GitHub rate-limit or installation responses.
- Automatic repository cache expiry is not implemented; repository metadata is refreshed only through manual administrator synchronization.
