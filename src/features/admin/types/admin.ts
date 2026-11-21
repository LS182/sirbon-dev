export type AdminSectionId =
  | 'overview'
  | 'repositories'
  | 'sync-history'
  | 'enquiries'
  | 'reviews'
  | 'settings'

export interface SyncRecord {
  id: string
  started_at: string
  completed_at?: string | null
  status: 'running' | 'success' | 'failed'
  repository_count: number
  public_count: number
  private_count: number
  error_message?: string | null
  initiated_by?: string | null
}

export interface SyncSummaryResult {
  success: boolean
  repositoryCount: number
  publicCount: number
  privateCount: number
  createdCount?: number
  updatedCount?: number
  removedCount?: number
  archivedCount?: number
}

export interface IntegrationStatus {
  d1Configured: boolean
  oauthConfigured: boolean
  adminAllowlistConfigured: boolean
  appInstallationConfigured: boolean
  notificationWebhookConfigured: boolean
  appOriginConfigured: boolean
}

export interface AdminOverviewData {
  projectCount: number
  newEnquiryCount: number
  pendingReviewCount: number
  lastSync: SyncRecord | null
  integrations?: IntegrationStatus
}

export interface AdminProjectRecord {
  id: string
  slug: string
  name: string
  summary: string
  description: string | null
  demo_url: string | null
  repository_id: string | null
  repository_full_name: string | null
  default_branch: string | null
  language: string | null
  topics: string | string[]
  is_private: number | boolean
  technologies: string | string[]
  featured: number | boolean
  published: number | boolean
  excluded: number | boolean
  sort_order: number
  public_name: string | null
  public_summary: string | null
  public_description: string | null
  synced_at: string | null
}

export interface AdminProjectsResponse {
  projects: AdminProjectRecord[]
  autoSynced: boolean
  syncSummary: SyncSummaryResult | null
  syncWarning: string | null
  lastSync: SyncRecord | null
}

export interface AdminEnquiryRecord {
  id: string
  name: string
  email: string
  company: string | null
  project_type: string
  budget: string | null
  description: string
  preferred_contact: string
  status: 'new' | 'read' | 'archived'
  created_at: string
}

export interface AdminReviewRecord {
  id: string
  name: string
  rating: number
  review: string
  project_reference: string | null
  status: 'pending' | 'approved' | 'rejected' | 'removed'
  created_at: string
}
