export interface PublicReview {
  id: string
  name: string
  rating: number
  review: string
  project_reference?: string
  created_at: string
}

export interface ReviewSubmissionPayload {
  name: string
  rating: number
  review: string
  projectReference: string
  website: string
}
