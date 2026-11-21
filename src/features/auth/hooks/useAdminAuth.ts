import { useCallback, useEffect, useState } from 'react'
import { fetchAdminAuthStatus, logoutAdmin } from '../services/authApi'

export function useAdminAuth() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [githubLogin, setGithubLogin] = useState('')
  const [csrfToken, setCsrfToken] = useState('')

  const refresh = useCallback(async () => {
    try {
      const status = await fetchAdminAuthStatus()
      setAuthenticated(status.authenticated)
      setGithubLogin(status.githubLogin || '')
      setCsrfToken(status.csrfToken || '')
      return status
    } catch {
      setAuthenticated(false)
      setGithubLogin('')
      setCsrfToken('')
      return null
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  const signOut = useCallback(async () => {
    try {
      await logoutAdmin(csrfToken)
    } finally {
      setAuthenticated(false)
      setGithubLogin('')
      setCsrfToken('')
    }
  }, [csrfToken])

  return {
    authenticated,
    githubLogin,
    csrfToken,
    refresh,
    signOut,
  }
}
