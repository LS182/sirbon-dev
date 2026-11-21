import { useEffect, useState } from 'react'
import { fetchApprovedReviews } from '../services/reviewsApi'
import type { PublicReview } from '../types/review'

export function useReviews() {
  const [reviews, setReviews] = useState<PublicReview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetchApprovedReviews()
      .then((items) => {
        if (active) setReviews(items)
      })
      .catch(() => {
        if (active) setReviews([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { reviews, loading }
}
