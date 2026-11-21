import { EmptyState } from '../../../shared/components'
import { formatShortDate } from '../../../shared/utils/format'
import type { SyncRecord } from '../types/admin'

export function AdminSyncHistorySection({ history }: { history: SyncRecord[] }) {
  return (
    <>
      <h1>Synchronization history</h1>
      {history.length === 0 ? (
        <EmptyState message="No synchronization runs recorded yet." />
      ) : (
        <div className="admin-list">
          {history.map((item) => (
            <article key={item.id}>
              <div>
                <div className="admin-title-row">
                  <span className={`status-badge status-${item.status}`}>{item.status}</span>
                  <strong>{item.repository_count} repositories</strong>
                </div>
                <small>
                  Started: {formatShortDate(item.started_at)}
                  {item.completed_at ? ` · Completed: ${formatShortDate(item.completed_at)}` : ''}
                  {item.initiated_by ? ` · By @${item.initiated_by}` : ''}
                </small>
                {item.error_message && <p className="inline-error">{item.error_message}</p>}
              </div>
              <small>{item.public_count} public / {item.private_count} private</small>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
