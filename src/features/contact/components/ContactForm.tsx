import { ArrowRight } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { ErrorBanner, SuccessBanner } from '../../../shared/components'
import { submitEnquiry } from '../services/contactApi'

export function ContactForm() {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setError('')
    setSubmitting(true)
    const formElement = event.currentTarget
    const form = new FormData(formElement)

    try {
      await submitEnquiry({
        name: String(form.get('name') || ''),
        email: String(form.get('email') || ''),
        company: String(form.get('company') || ''),
        projectType: String(form.get('projectType') || 'web-app'),
        budget: String(form.get('budget') || 'not-sure'),
        description: String(form.get('description') || ''),
        preferredContact: String(form.get('preferredContact') || 'email'),
        phone: String(form.get('phone') || ''),
        website: String(form.get('website') || ''),
      })
      setSubmitted(true)
      formElement.reset()
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to send enquiry')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return <SuccessBanner message="Your enquiry was received. Thank you for reaching out." />
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} aria-label="Contact enquiry">
      <div className="form-field">
        <label htmlFor="contact-name">Name <span aria-hidden="true">*</span></label>
        <input id="contact-name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={100} />
      </div>
      <div className="form-field">
        <label htmlFor="contact-email">Email <span aria-hidden="true">*</span></label>
        <input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={254}
        />
      </div>
      <div className="form-field">
        <label htmlFor="contact-company">Company or organisation (optional)</label>
        <input id="contact-company" name="company" type="text" autoComplete="organization" maxLength={160} />
      </div>
      <div className="form-field">
        <label htmlFor="contact-type">Enquiry type <span aria-hidden="true">*</span></label>
        <select id="contact-type" name="projectType" required defaultValue="web-app">
          <option value="web-app">Web application</option>
          <option value="api">API or database work</option>
          <option value="automation">Automation / scripting</option>
          <option value="consulting">Technical collaboration</option>
          <option value="other">Graduate / junior role or other</option>
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="contact-budget">Project scope / budget (optional)</label>
        <select id="contact-budget" name="budget" defaultValue="not-sure">
          <option value="not-sure">Not applicable / not sure</option>
          <option value="under-5k">Small scope</option>
          <option value="5k-10k">Medium scope</option>
          <option value="10k-25k">Full application</option>
          <option value="25k-plus">Long-term engagement</option>
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="contact-preferred">Preferred contact <span aria-hidden="true">*</span></label>
        <select id="contact-preferred" name="preferredContact" required defaultValue="email">
          <option value="email">Email</option>
          <option value="phone">Phone</option>
        </select>
      </div>
      <div className="form-field full">
        <label htmlFor="contact-phone">Phone (optional)</label>
        <input id="contact-phone" name="phone" type="tel" autoComplete="tel" maxLength={40} />
      </div>
      <div className="form-field full">
        <label htmlFor="contact-description">Project or opportunity description <span aria-hidden="true">*</span></label>
        <span id="contact-description-hint" className="field-hint">At least 20 characters.</span>
        <textarea
          id="contact-description"
          name="description"
          aria-describedby="contact-description-hint"
          required
          minLength={20}
          maxLength={5000}
          placeholder="Share context about the role, project goals, timeline or technical requirements."
        />
      </div>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {error && <ErrorBanner message={error} fullWidth />}
      <button className="button primary" type="submit" disabled={submitting}>
        {submitting ? 'Sending…' : <>Send enquiry <ArrowRight size={16} aria-hidden="true" /></>}
      </button>
    </form>
  )
}
