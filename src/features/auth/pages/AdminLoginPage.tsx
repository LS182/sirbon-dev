import { Github } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoadingState, PageHeader } from '../../../shared/components'
import { usePageTitle } from '../../../shared/hooks/usePageTitle'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { GITHUB_OAUTH_LOGIN_URL } from '../services/authApi'

export function AdminLoginPage() {
  usePageTitle('Administration Sign In')
  const { authenticated } = useAdminAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (authenticated) {
      navigate('/admin/dashboard', { replace: true })
    }
  }, [authenticated, navigate])

  return (
    <section className="page inner-page admin-login">
      <PageHeader
        eyebrow="ADMINISTRATION"
        title="Content console"
        intro="Sign in with Liam's allowlisted GitHub administrator account to manage synchronized repositories, enquiries, reviews and site settings."
      />
      {authenticated === null ? (
        <LoadingState label="Checking session…" />
      ) : (
        <div className="actions">
          <a className="button primary" href={GITHUB_OAUTH_LOGIN_URL}>
            <Github size={16} aria-hidden="true" /> Continue with GitHub
          </a>
        </div>
      )}
    </section>
  )
}
