import { FormEvent, useState } from 'react'
import { ErrorBanner, SuccessBanner } from '../../../shared/components'
import { submitReview } from '../services/reviewsApi'

export function ReviewForm() {
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
      await submitReview({
        name: String(form.get('name') || ''),
        rating: Number(form.get('rating')),
        review: String(form.get('review') || ''),
        projectReference: String(form.get('projectReference') || ''),
        website: String(form.get('website') || ''),
      })
      setSubmitted(true)
      formElement.reset()
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return <SuccessBanner message="Thank you — your review has been submitted for moderation." />
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} aria-label="Submit a review">
      <div className="form-field">
        <label htmlFor="review-name">Name <span aria-hidden="true">*</span></label>
        <input id="review-name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={100} />
      </div>
      <div className="form-field">
        <label htmlFor="review-rating">Rating <span aria-hidden="true">*</span></label>
        <select id="review-rating" name="rating" required defaultValue="5">
          <option value="5">5 — Excellent</option>
          <option value="4">4 — Good</option>
          <option value="3">3 — Average</option>
          <option value="2">2 — Fair</option>
          <option value="1">1 — Poor</option>
        </select>
      </div>
      <div className="form-field full">
        <label htmlFor="review-project">Project or coursework reference (optional)</label>
        <input
          id="review-project"
          name="projectReference"
          type="text"
          maxLength={160}
        />
      </div>
      <div className="form-field full">
        <label htmlFor="review-body">Review <span aria-hidden="true">*</span></label>
        <span id="review-body-hint" className="field-hint">At least 10 characters.</span>
        <textarea
          id="review-body"
          name="review"
          aria-describedby="review-body-hint"
          required
          minLength={10}
          maxLength={2000}
          placeholder="Describe what you worked on together and how it went."
        />
      </div>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="review-website">Website</label>
        <input id="review-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {error && <ErrorBanner message={error} fullWidth />}
      <button className="button primary" type="submit" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit review'}
      </button>
    </form>
  )
}
