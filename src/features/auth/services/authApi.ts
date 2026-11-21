import { apiRequest } from '../../../shared/api/client'
import type { AdminAuthStatus } from '../types/auth'

export const GITHUB_OAUTH_LOGIN_URL = '/api/auth/github'

export function fetchAdminAuthStatus(): Promise<AdminAuthStatus> {
  return apiRequest<AdminAuthStatus>('/api/admin/status')
}

export async function logoutAdmin(csrfToken: string): Promise<void> {
  await apiRequest('/api/admin/logout', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
  })
}
