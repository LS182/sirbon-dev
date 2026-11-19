ALTER TABLE projects ADD COLUMN repository_id TEXT;
ALTER TABLE projects ADD COLUMN repository_full_name TEXT;
ALTER TABLE projects ADD COLUMN is_private INTEGER NOT NULL DEFAULT 1;
ALTER TABLE projects ADD COLUMN default_branch TEXT;
ALTER TABLE projects ADD COLUMN language TEXT;
ALTER TABLE projects ADD COLUMN topics TEXT NOT NULL DEFAULT '[]';
ALTER TABLE projects ADD COLUMN readme_cached TEXT;
ALTER TABLE projects ADD COLUMN public_summary TEXT;
ALTER TABLE projects ADD COLUMN public_description TEXT;
ALTER TABLE projects ADD COLUMN public_name TEXT;
ALTER TABLE projects ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN excluded INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN synced_at TEXT;

CREATE INDEX IF NOT EXISTS projects_published_order_idx
  ON projects(published, excluded, featured DESC, sort_order ASC, name ASC);
CREATE INDEX IF NOT EXISTS projects_repository_idx ON projects(repository_id);

CREATE TABLE IF NOT EXISTS repository_sync_history (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  repository_count INTEGER NOT NULL DEFAULT 0,
  public_count INTEGER NOT NULL DEFAULT 0,
  private_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  initiated_by TEXT
);

CREATE TABLE IF NOT EXISTS enquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  project_type TEXT NOT NULL,
  budget TEXT,
  description TEXT NOT NULL,
  preferred_contact TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  honeypot TEXT,
  ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS enquiries_status_created_idx ON enquiries(status, created_at DESC);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT NOT NULL,
  project_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'removed')),
  ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  moderated_at TEXT,
  moderated_by TEXT
);

CREATE INDEX IF NOT EXISTS reviews_public_idx ON reviews(status, created_at DESC);

CREATE TABLE IF NOT EXISTS administrators (
  github_account_id TEXT PRIMARY KEY,
  github_login TEXT NOT NULL,
  display_name TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  session_hash TEXT NOT NULL UNIQUE,
  csrf_hash TEXT NOT NULL,
  github_account_id TEXT NOT NULL,
  github_login TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS oauth_states (
  state_hash TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submission_limits (
  id TEXT PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS submission_limits_rate_idx
  ON submission_limits(ip_hash, endpoint, created_at DESC);
