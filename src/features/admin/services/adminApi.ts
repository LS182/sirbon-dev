import type { ProjectUpdate } from '../../../../shared/schemas'
import { apiRequest } from '../../../shared/api/client'
import type {
  AdminEnquiryRecord,
  AdminOverviewData,
  AdminProjectsResponse,
  AdminReviewRecord,
  SyncRecord,
  SyncSummaryResult,
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

export function fetchAdminProjects(options?: { autoSync?: boolean }): Promise<AdminProjectsResponse> {
  const query = options?.autoSync === false ? '?autoSync=false' : ''
  return apiRequest<AdminProjectsResponse>(`/api/admin/projects${query}`)
}

export function triggerRepositorySync(csrfToken: string): Promise<SyncSummaryResult> {
  return apiRequest<SyncSummaryResult>(
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
