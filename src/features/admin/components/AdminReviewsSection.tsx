import { EmptyState } from '../../../shared/components'
import { formatShortDate } from '../../../shared/utils/format'
import type { AdminReviewRecord } from '../types/admin'

interface AdminReviewsSectionProps {
  reviews: AdminReviewRecord[]
  busy: boolean
  onModerate: (id: string, status: 'approved' | 'rejected' | 'removed') => Promise<void>
}

export function AdminReviewsSection({ reviews, busy, onModerate }: AdminReviewsSectionProps) {
  return (
    <>
      <h1>Review moderation</h1>
      {reviews.length === 0 ? (
        <EmptyState message="No reviews submitted yet." />
      ) : (
        <div className="admin-list">
          {reviews.map((item) => (
            <article key={item.id}>
              <div>
                <div className="admin-title-row">
                  <strong>{item.name} · {item.rating}/5</strong>
                  <span className={`status-badge status-${item.status}`}>{item.status}</span>
                </div>
                <p>{item.review}</p>
                <small>
                  {item.project_reference ? `${item.project_reference} · ` : ''}
                  {formatShortDate(item.created_at)}
                </small>
              </div>
              <div className="toggle-row">
                <button
                  type="button"
                  disabled={busy}
                  className={item.status === 'approved' ? 'active' : ''}
                  onClick={() => void onModerate(item.id, 'approved')}
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className={item.status === 'rejected' ? 'active' : ''}
                  onClick={() => void onModerate(item.id, 'rejected')}
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className={item.status === 'removed' ? 'active' : ''}
                  onClick={() => void onModerate(item.id, 'removed')}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
