import { ArrowUpRight } from 'lucide-react'
import { siteConfig } from '../../../app/config/site'
import { usePageTitle } from '../../../shared/hooks/usePageTitle'
import { ContactForm } from '../components/ContactForm'

export function ContactPage() {
  usePageTitle('Contact')

  return (
    <section className="page inner-page contact-page">
      <div>
        <p className="eyebrow">CONTACT LIAM</p>
        <h1>Opportunity or project?</h1>
        <p className="hero-copy">
          Use the form for graduate or junior opportunities, collaboration, or a practical development project. A short description of the problem and expected outcome is most useful.
        </p>
        <div className="contact-details">
          <div>
            <span>Location</span>
            <strong>{siteConfig.location}</strong>
          </div>
          <div>
            <span>GitHub</span>
            <a href={siteConfig.githubUrl} target="_blank" rel="noreferrer">
              {siteConfig.githubHandle} <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
      <ContactForm />
    </section>
  )
}
