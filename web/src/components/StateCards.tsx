import { errorMessage } from '../api'

/** Shown while a screen waits for the server. */
export function LoadingCard({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="state-card" role="status" aria-busy="true">
      {label}
    </div>
  )
}

/** Shown when a load failed. `onRetry` adds a "Try again" button. */
export function ErrorCard({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="state-card state-card-error" role="alert">
      <p>{errorMessage(error)}</p>
      {onRetry && (
        <button type="button" className="btn btn-primary btn-lg" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}
