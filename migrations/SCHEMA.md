# Cloudflare D1 Database Schema Reference

- **D1 Binding**: `DB`
- **Database Name**: `sirbon`
- **Applied Remote Migrations**:
  1. `0001_initial.sql` — Base `projects` and `posts` tables.
  2. `0002_portfolio_application.sql` — Repository metadata columns on `projects`, plus `repository_sync_history`, `enquiries`, `reviews`, `administrators`, `auth_sessions`, `oauth_states`, `site_settings`, and `submission_limits`.

> Do not edit, rewrite, or reset applied migrations (`0001_initial.sql`, `0002_portfolio_application.sql`). Any future schema change must be created as a new additive migration (e.g. `0003_*.sql`) and explicitly approved before applying remotely.

## Tables & Ownership

| Table | Backend Query Module | Purpose |
| :--- | :--- | :--- |
| `projects` | `functions/_lib/database/projects.ts` | Synced GitHub repositories and curated portfolio entries. Private repos (`is_private = 1`) remain hidden publicly unless `published = 1`, `excluded = 0`, and `public_name`, `public_summary`, and `public_description` are explicitly authored. |
| `repository_sync_history` | `functions/_lib/database/syncHistory.ts` | Audit trail of manual GitHub synchronization runs (status, counts, initiator, errors). |
| `enquiries` | `functions/_lib/database/enquiries.ts` | Public contact form submissions with moderation workflow (`new`, `read`, `archived`). |
| `reviews` | `functions/_lib/database/reviews.ts` | Public feedback submissions with moderation workflow (`pending`, `approved`, `rejected`, `removed`). |
| `administrators` | `functions/_lib/database/auth.ts` | Allowlisted administrator records keyed by immutable `github_account_id`. |
| `auth_sessions` | `functions/_lib/database/auth.ts` | Server-side sessions storing SHA-256 hashed session IDs, hashed CSRF tokens, and 12-hour expiry timestamps. |
| `oauth_states` | `functions/_lib/database/auth.ts` | Single-use SHA-256 hashed OAuth CSRF state tokens (10-minute expiry). |
| `submission_limits` | `functions/_lib/database/rateLimit.ts` | Per-IP hashed rate-limiting window (5 submissions per hour per public form endpoint). |
| `site_settings` | `functions/_lib/database/settings.ts` | Key-value site configuration managed from the admin dashboard. |
| `posts` | Reserved (`0001_initial.sql`) | Present in the initial schema for future writing/notes support. |
