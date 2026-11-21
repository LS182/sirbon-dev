import { apiRequest } from '../../../shared/api/client'
import type { PublicReview, ReviewSubmissionPayload } from '../types/review'

export async function fetchApprovedReviews(): Promise<PublicReview[]> {
  const data = await apiRequest<{ reviews: PublicReview[] }>('/api/reviews')
  return data.reviews
}

export async function submitReview(payload: ReviewSubmissionPayload): Promise<void> {
  await apiRequest('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
