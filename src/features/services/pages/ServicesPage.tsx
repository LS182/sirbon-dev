import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../../shared/components'
import { usePageTitle } from '../../../shared/hooks/usePageTitle'
import { profile } from '../../about'
import { skillGroups } from '../../skills'

export function ServicesPage() {
  usePageTitle('Focus & Capabilities')

  return (
    <section className="page inner-page services-page">
      <PageHeader
        eyebrow="FOCUS & CAPABILITIES"
        title="Areas of development work."
        intro={profile.direction}
      />

      <div className="capability-list">
        {skillGroups.map((group, index) => (
          <article className="capability-row" key={group.id}>
            <span className="index-number">{String(index + 1).padStart(2, '0')}</span>
            <h2>{group.title}</h2>
            <p>{group.items.join(' · ')}</p>
          </article>
        ))}
      </div>

      <div className="cta-strip">
        <div>
          <h2>Interested in collaborating or discussing a role?</h2>
          <p>Use the contact form to share an opportunity, project scope or technical question.</p>
        </div>
        <Link className="button primary" to="/contact">
          Get in touch <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
