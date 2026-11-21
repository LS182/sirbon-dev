import { apiRequest } from '../../../shared/api/client'
import type { EnquirySubmissionPayload } from '../types/contact'

export async function submitEnquiry(payload: EnquirySubmissionPayload): Promise<void> {
  await apiRequest('/api/enquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
