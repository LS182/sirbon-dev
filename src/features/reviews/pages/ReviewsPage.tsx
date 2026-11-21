import { EmptyState, LoadingState, PageHeader } from '../../../shared/components'
import { usePageTitle } from '../../../shared/hooks/usePageTitle'
import { ReviewCard } from '../components/ReviewCard'
import { ReviewForm } from '../components/ReviewForm'
import { useReviews } from '../hooks/useReviews'

export function ReviewsPage() {
  usePageTitle('Reviews')
  const { reviews, loading } = useReviews()

  return (
    <section className="page inner-page">
      <PageHeader
        eyebrow="REVIEWS"
        title="Peer & collaborator feedback."
        intro="Verified feedback from project collaborators, classmates and clients. All submitted reviews are moderated before publication."
      />

      {loading ? (
        <LoadingState label="Loading reviews…" />
      ) : reviews.length === 0 ? (
        <EmptyState message="No approved reviews are published yet. You can submit feedback below." />
      ) : (
        <div className="reviews-grid">
          {reviews.map((item) => <ReviewCard key={item.id} item={item} />)}
        </div>
      )}

      <div className="form-section">
        <div>
          <p className="eyebrow">SUBMIT A REVIEW</p>
          <h2>Share your experience.</h2>
          <p className="section-subcopy">
            Worked with Liam on a project or coursework team? Leave an honest note about the collaboration.
          </p>
        </div>
        <ReviewForm />
      </div>
    </section>
  )
}
