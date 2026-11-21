import { Star } from 'lucide-react'
import type { PublicReview } from '../types/review'

export function ReviewCard({ item }: { item: PublicReview }) {
  return (
    <article className="review-card">
      <div className="stars" role="img" aria-label={`${item.rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} size={16} aria-hidden="true" fill={star <= item.rating ? 'currentColor' : 'none'} />
        ))}
      </div>
      <blockquote>{item.review}</blockquote>
      <p className="review-author">
        <strong>{item.name}</strong>
        {item.project_reference ? ` · ${item.project_reference}` : ''}
      </p>
    </article>
  )
}
