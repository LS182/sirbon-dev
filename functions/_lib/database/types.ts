export interface ProjectRow {
  id: string
  slug: string
  name: string
  summary: string
  description: string | null
  repository_url: string | null
  demo_url: string | null
  technologies: string
  featured: number | boolean
  published: number | boolean
  excluded: number | boolean
  is_private: number | boolean
  repository_id: string | null
  repository_full_name: string | null
  default_branch: string | null
  language: string | null
  topics: string
  readme_cached: string | null
  public_name: string | null
  public_summary: string | null
  public_description: string | null
  sort_order: number
  synced_at: string | null
  created_at: string
  updated_at: string
}

export interface EnquiryRow {
  id: string
  name: string
  email: string
  company: string | null
  project_type: string
  budget: string | null
  description: string
  preferred_contact: string
  status: 'new' | 'read' | 'archived'
  honeypot: string | null
  ip_hash: string | null
  created_at: string
}

export interface ReviewRow {
  id: string
  name: string
  rating: number
  review: string
  project_reference: string | null
  status: 'pending' | 'approved' | 'rejected' | 'removed'
  ip_hash?: string | null
  created_at: string
  moderated_at?: string | null
  moderated_by?: string | null
}

export interface AuthSessionRow {
  github_account_id: string
  github_login: string
  csrf_hash: string
  expires_at: string
}

export interface SyncHistoryRow {
  id: string
  started_at: string
  completed_at: string | null
  status: 'running' | 'success' | 'failed'
  repository_count: number
  public_count: number
  private_count: number
  error_message: string | null
  initiated_by: string | null
}
