import { Link } from 'react-router-dom'
import { PageHeader } from '../../../shared/components'
import { usePageTitle } from '../../../shared/hooks/usePageTitle'

export function NotFoundPage() {
  usePageTitle('Page Not Found')

  return (
    <section className="page inner-page not-found">
      <PageHeader
        eyebrow="404"
        title="Page not found."
        intro="The page you requested does not exist or may have moved."
      />
      <div className="actions">
        <Link className="button primary" to="/">Return home</Link>
        <Link className="button" to="/projects">View projects</Link>
      </div>
    </section>
  )
}
