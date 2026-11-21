import type { ProjectUpdate } from '../../../../shared/schemas'
import { apiRequest } from '../../../shared/api/client'
import type {
  AdminEnquiryRecord,
  AdminOverviewData,
  AdminProjectRecord,
  AdminReviewRecord,
  SyncRecord,
} from '../types/admin'

function mutationHeaders(csrfToken: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  }
}

export function fetchAdminOverview(): Promise<AdminOverviewData> {
  return apiRequest<AdminOverviewData>('/api/admin/overview')
}

export async function fetchAdminProjects(): Promise<AdminProjectRecord[]> {
  const data = await apiRequest<{ projects: AdminProjectRecord[] }>('/api/admin/projects')
  return data.projects
}

export function triggerRepositorySync(csrfToken: string) {
  return apiRequest<{ success: boolean; repositoryCount: number; publicCount: number; privateCount: number }>(
    '/api/admin/projects/sync',
    { method: 'POST', headers: mutationHeaders(csrfToken) },
  )
}

export function updateAdminProjectRecord(slug: string, payload: ProjectUpdate, csrfToken: string) {
  return apiRequest<{ updated: boolean }>(`/api/admin/projects/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    headers: mutationHeaders(csrfToken),
    body: JSON.stringify(payload),
  })
}

export async function fetchSyncHistory(): Promise<SyncRecord[]> {
  const data = await apiRequest<{ history: SyncRecord[] }>('/api/admin/sync-history')
  return data.history
}

export async function fetchAdminEnquiries(): Promise<AdminEnquiryRecord[]> {
  const data = await apiRequest<{ enquiries: AdminEnquiryRecord[] }>('/api/admin/enquiries')
  return data.enquiries
}

export function updateEnquiryStatusRecord(
  id: string,
  status: 'new' | 'read' | 'archived',
  csrfToken: string,
) {
  return apiRequest<{ updated: boolean }>('/api/admin/enquiries', {
    method: 'PATCH',
    headers: mutationHeaders(csrfToken),
    body: JSON.stringify({ id, status }),
  })
}

export async function fetchAdminReviews(): Promise<AdminReviewRecord[]> {
  const data = await apiRequest<{ reviews: AdminReviewRecord[] }>('/api/admin/reviews')
  return data.reviews
}

export function moderateReviewRecord(
  id: string,
  status: 'approved' | 'rejected' | 'removed',
  csrfToken: string,
) {
  return apiRequest<{ updated: boolean }>('/api/admin/reviews', {
    method: 'PATCH',
    headers: mutationHeaders(csrfToken),
    body: JSON.stringify({ id, status }),
  })
}

export async function fetchAdminSettings(): Promise<Record<string, string>> {
  const data = await apiRequest<{ settings: Record<string, string> }>('/api/admin/settings')
  return data.settings
}

export function saveAdminSettings(settings: Record<string, string>, csrfToken: string) {
  return apiRequest<{ updated: boolean }>('/api/admin/settings', {
    method: 'PUT',
    headers: mutationHeaders(csrfToken),
    body: JSON.stringify(settings),
  })
}
