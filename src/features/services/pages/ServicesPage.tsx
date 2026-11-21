import { ArrowRight, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../../shared/components'
import { usePageTitle } from '../../../shared/hooks/usePageTitle'
import { serviceCapabilities } from '../data/services'

export function ServicesPage() {
  usePageTitle('Services & Capabilities')

  return (
    <section className="page inner-page services-page">
      <PageHeader
        eyebrow="SERVICES & CAPABILITIES"
        title="Practical development & collaboration."
        intro="Available for graduate and junior software engineering roles, technical collaboration, and well-scoped full-stack or database development work."
      />

      <div className="services-grid">
        {serviceCapabilities.map((service) => (
          <article className="service-card" key={service.number}>
            <div className="service-header">
              <span className="index-number">{service.number}</span>
              <Wrench size={18} aria-hidden="true" />
            </div>
            <h2>{service.title}</h2>
            <p>{service.summary}</p>
            <ul>
              {service.details.map((detail) => <li key={detail}>{detail}</li>)}
            </ul>
          </article>
        ))}
      </div>

      <div className="cta-strip">
        <div>
          <h2>Have a role or project in mind?</h2>
          <p>Share the problem context, timeline or team requirements and I will respond promptly.</p>
        </div>
        <Link className="button primary" to="/contact">
          Discuss an opportunity <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
