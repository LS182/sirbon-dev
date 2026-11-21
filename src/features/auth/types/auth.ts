export interface AdminAuthStatus {
  authenticated: boolean
  githubLogin?: string
  csrfToken: string
}
