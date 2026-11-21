import { EmptyState } from '../../../shared/components'
import { formatShortDate } from '../../../shared/utils/format'
import type { AdminEnquiryRecord } from '../types/admin'

interface AdminEnquiriesSectionProps {
  enquiries: AdminEnquiryRecord[]
  busy: boolean
  onChangeStatus: (id: string, status: 'new' | 'read' | 'archived') => Promise<void>
}

export function AdminEnquiriesSection({ enquiries, busy, onChangeStatus }: AdminEnquiriesSectionProps) {
  return (
    <>
      <h1>Customer enquiries</h1>
      {enquiries.length === 0 ? (
        <EmptyState message="No enquiries yet." />
      ) : (
        <div className="admin-list">
          {enquiries.map((item) => (
            <article key={item.id}>
              <div>
                <div className="admin-title-row">
                  <strong>{item.name}</strong>
                  <span className={`status-badge status-${item.status}`}>{item.status}</span>
                </div>
                <small>
                  {item.email}
                  {item.company ? ` · ${item.company}` : ''}
                  {' · '}{item.project_type}
                  {' · '}Preferred: {item.preferred_contact}
                  {item.created_at ? ` · ${formatShortDate(item.created_at)}` : ''}
                </small>
                <p>{item.description}</p>
              </div>
              <div className="toggle-row">
                <button
                  type="button"
                  disabled={busy}
                  className="button"
                  onClick={() => void onChangeStatus(item.id, item.status === 'read' ? 'archived' : 'read')}
                >
                  {item.status === 'read' ? 'Archive' : 'Mark read'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
