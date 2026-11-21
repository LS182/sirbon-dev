import { AlertCircle, Check, LoaderCircle } from 'lucide-react'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={18} aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorBanner({ message, fullWidth = false }: { message: string; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? 'error-state full' : 'error-state'} role="alert">
      <AlertCircle size={16} aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="success-state" role="status">
      <Check size={16} aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return <div className="empty-state">{message}</div>
}
