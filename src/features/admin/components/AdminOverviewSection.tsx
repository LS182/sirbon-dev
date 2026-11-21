import { formatShortDate } from '../../../shared/utils/format'
import type { AdminOverviewData } from '../types/admin'

export function AdminOverviewSection({ data }: { data: AdminOverviewData }) {
  const integrations = data.integrations

  return (
    <>
      <h1>Overview</h1>
      <div className="stat-grid">
        <div>
          <span>Projects</span>
          <strong>{data.projectCount}</strong>
        </div>
        <div>
          <span>New enquiries</span>
          <strong>{data.newEnquiryCount}</strong>
        </div>
        <div>
          <span>Pending reviews</span>
          <strong>{data.pendingReviewCount}</strong>
        </div>
      </div>

      {data.lastSync && (
        <div className="admin-panel">
          <h2>Latest repository sync</h2>
          <p>
            Status: <span className={`status-badge status-${data.lastSync.status}`}>{data.lastSync.status}</span>
            {' · '}Total: {data.lastSync.repository_count} ({data.lastSync.public_count} public, {data.lastSync.private_count} private)
            {data.lastSync.started_at ? ` · ${formatShortDate(data.lastSync.started_at)}` : ''}
          </p>
        </div>
      )}

      {integrations && (
        <div className="admin-panel">
          <h2>Integration status</h2>
          <ul className="integration-list">
            <li>
              <span>Cloudflare D1 (`DB`)</span>
              <span className={integrations.d1Configured ? 'status-badge status-success' : 'status-badge status-pending'}>
                {integrations.d1Configured ? 'Connected' : 'Unbound'}
              </span>
            </li>
            <li>
              <span>GitHub OAuth (Admin login)</span>
              <span className={integrations.oauthConfigured ? 'status-badge status-success' : 'status-badge status-pending'}>
                {integrations.oauthConfigured ? 'Configured' : 'Not configured'}
              </span>
            </li>
            <li>
              <span>GitHub App Installation (Private repos)</span>
              <span className={integrations.appInstallationConfigured ? 'status-badge status-success' : 'status-badge status-pending'}>
                {integrations.appInstallationConfigured ? 'Configured' : 'Public-only fallback'}
              </span>
            </li>
            <li>
              <span>Enquiry Notification Webhook</span>
              <span className={integrations.notificationWebhookConfigured ? 'status-badge status-success' : 'status-badge status-pending'}>
                {integrations.notificationWebhookConfigured ? 'Configured' : 'Optional / unset'}
              </span>
            </li>
          </ul>
        </div>
      )}
    </>
  )
}
