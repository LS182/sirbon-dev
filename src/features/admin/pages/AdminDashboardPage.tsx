import { LogOut } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { ProjectUpdate } from '../../../../shared/schemas'
import { ApiError } from '../../../shared/api/client'
import { ErrorBanner, LoadingState, SuccessBanner } from '../../../shared/components'
import { usePageTitle } from '../../../shared/hooks/usePageTitle'
import { useAdminAuth } from '../../auth'
import { AdminEnquiriesSection } from '../components/AdminEnquiriesSection'
import { AdminOverviewSection } from '../components/AdminOverviewSection'
import { AdminProjectsSection } from '../components/AdminProjectsSection'
import { AdminReviewsSection } from '../components/AdminReviewsSection'
import { AdminSettingsSection } from '../components/AdminSettingsSection'
import { AdminSyncHistorySection } from '../components/AdminSyncHistorySection'
import {
  fetchAdminEnquiries,
  fetchAdminOverview,
  fetchAdminProjects,
  fetchAdminReviews,
  fetchAdminSettings,
  fetchSyncHistory,
  moderateReviewRecord,
  saveAdminSettings,
  triggerRepositorySync,
  updateAdminProjectRecord,
  updateEnquiryStatusRecord,
} from '../services/adminApi'
import type {
  AdminEnquiryRecord,
  AdminOverviewData,
  AdminProjectRecord,
  AdminReviewRecord,
  AdminSectionId,
  SyncRecord,
  SyncSummaryResult,
} from '../types/admin'

const NAV_ITEMS: Array<{ id: AdminSectionId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'repositories', label: 'Repositories' },
  { id: 'sync-history', label: 'Sync history' },
  { id: 'enquiries', label: 'Enquiries' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'settings', label: 'Settings' },
]

function formatSyncMessage(summary: SyncSummaryResult): string {
  const parts = [`Synchronized ${summary.repositoryCount} repositories (${summary.publicCount} public, ${summary.privateCount} private)`]
  if (summary.removedCount && summary.removedCount > 0) {
    parts.push(`${summary.removedCount} removed/revoked hidden`)
  }
  return `${parts.join(' · ')}.`
}

export function AdminDashboardPage() {
  usePageTitle('Administration Dashboard')
  const { authenticated, githubLogin, csrfToken, signOut } = useAdminAuth()
  const navigate = useNavigate()

  const [section, setSection] = useState<AdminSectionId>('overview')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  const [overview, setOverview] = useState<AdminOverviewData | null>(null)
  const [projects, setProjects] = useState<AdminProjectRecord[]>([])
  const [projectsLastSync, setProjectsLastSync] = useState<SyncRecord | null>(null)
  const [syncWarning, setSyncWarning] = useState<string | null>(null)
  const [history, setHistory] = useState<SyncRecord[]>([])
  const [enquiries, setEnquiries] = useState<AdminEnquiryRecord[]>([])
  const [reviews, setReviews] = useState<AdminReviewRecord[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})

  const loadSection = useCallback(async (target: AdminSectionId, opts?: { skipAutoSync?: boolean }) => {
    setLoading(true)
    setError('')
    try {
      if (target === 'overview') {
        setOverview(await fetchAdminOverview())
      } else if (target === 'repositories') {
        const res = await fetchAdminProjects({ autoSync: opts?.skipAutoSync ? false : true })
        setProjects(res.projects)
        setProjectsLastSync(res.lastSync)
        setSyncWarning(res.syncWarning)
        if (res.autoSynced && res.syncSummary) {
          setFeedback(formatSyncMessage(res.syncSummary))
        }
      } else if (target === 'sync-history') {
        setHistory(await fetchSyncHistory())
      } else if (target === 'enquiries') {
        setEnquiries(await fetchAdminEnquiries())
      } else if (target === 'reviews') {
        setReviews(await fetchAdminReviews())
      } else if (target === 'settings') {
        setSettings(await fetchAdminSettings())
      }
    } catch (issue) {
      if (issue instanceof ApiError && (issue.status === 401 || issue.status === 403)) {
        navigate('/admin', { replace: true })
        return
      }
      setError(issue instanceof Error ? issue.message : 'Unable to load administration data')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    if (!authenticated) return
    const timer = window.setTimeout(() => {
      void loadSection(section)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [authenticated, loadSection, section])

  async function runMutation<T>(action: () => Promise<T>, messageForResult: string | ((result: T) => string)) {
    setBusy(true)
    setError('')
    setFeedback('')
    try {
      const result = await action()
      const msg = typeof messageForResult === 'function' ? messageForResult(result) : messageForResult
      setFeedback(msg)
      await loadSection(section, { skipAutoSync: true })
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleLogout() {
    await signOut()
    navigate('/admin')
  }

  if (authenticated === null) {
    return (
      <section className="page inner-page">
        <LoadingState label="Verifying administrator session…" />
      </section>
    )
  }

  if (authenticated === false) {
    return (
      <section className="page inner-page">
        <p className="eyebrow">ADMINISTRATION</p>
        <h1>Authentication required</h1>
        <p className="page-intro">Your session has expired or is not authorized.</p>
        <div className="actions">
          <Link className="button primary" to="/admin">Sign in</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="page admin-dashboard">
      <aside>
        <div className="admin-sidebar-header">
          <p className="eyebrow">DASHBOARD</p>
          {githubLogin && <span className="admin-user">@{githubLogin}</span>}
        </div>
        <nav aria-label="Administration sections">
          {NAV_ITEMS.map((item) => (
            <button
              type="button"
              key={item.id}
              className={section === item.id ? 'active' : ''}
              aria-current={section === item.id ? 'page' : undefined}
              onClick={() => {
                setSection(item.id)
                setFeedback('')
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button type="button" className="button admin-logout" onClick={() => void handleLogout()}>
          <LogOut size={15} aria-hidden="true" /> Sign out
        </button>
      </aside>

      <div className="dashboard-main">
        {error && <ErrorBanner message={error} />}
        {feedback && <SuccessBanner message={feedback} />}

        {loading ? (
          <LoadingState label={section === 'repositories' ? 'Loading & checking GitHub repositories…' : 'Loading administration data…'} />
        ) : (
          <>
            {section === 'overview' && overview && <AdminOverviewSection data={overview} />}
            {section === 'repositories' && (
              <AdminProjectsSection
                projects={projects}
                lastSync={projectsLastSync}
                syncWarning={syncWarning}
                busy={busy}
                onSync={() => runMutation(() => triggerRepositorySync(csrfToken), formatSyncMessage)}
                onUpdateProject={(slug: string, payload: ProjectUpdate, message: string) =>
                  runMutation(() => updateAdminProjectRecord(slug, payload, csrfToken), message)}
              />
            )}
            {section === 'sync-history' && <AdminSyncHistorySection history={history} />}
            {section === 'enquiries' && (
              <AdminEnquiriesSection
                enquiries={enquiries}
                busy={busy}
                onChangeStatus={(id, status) =>
                  runMutation(() => updateEnquiryStatusRecord(id, status, csrfToken), 'Enquiry status updated.')}
              />
            )}
            {section === 'reviews' && (
              <AdminReviewsSection
                reviews={reviews}
                busy={busy}
                onModerate={(id, status) =>
                  runMutation(() => moderateReviewRecord(id, status, csrfToken), `Review marked as ${status}.`)}
              />
            )}
            {section === 'settings' && (
              <AdminSettingsSection
                settings={settings}
                busy={busy}
                onSave={(values) => runMutation(() => saveAdminSettings(values, csrfToken), 'Settings saved.')}
              />
            )}
          </>
        )}
      </div>
    </section>
  )
}
