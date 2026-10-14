import Badge from './Badge'
import { LockIcon } from './icons'
import { formatDate } from '../lib/format'
import type { OpenRequest } from '../types/proposal'

type Props = {
  request: OpenRequest
  onNegotiate: (request: OpenRequest) => void
  /** True while the proposal is being sent. */
  busy?: boolean
}

// One buyer request, as a seller sees it. The buyer's budget is never part of it (rule 5).
export default function RequestCard({ request, onNegotiate, busy = false }: Props) {
  return (
    <article className="card service-card">
      <div className="service-card-body">
        <div className="service-card-tags">
          <Badge tone="info">{request.category}</Badge>
          {request.mine && <Badge tone="primary">Your request</Badge>}
          {request.locked && (
            <Badge tone="warning">
              <LockIcon size={12} />
              Locked
            </Badge>
          )}
        </div>
        <h3>{request.title}</h3>
        <p className="muted service-card-seller">{request.buyerName}</p>
        <p>{request.deliverables}</p>
      </div>
      <div className="service-card-side">
        <div className="service-card-price">
          <div className="muted caption">Needed by</div>
          <div className="service-card-amount">{formatDate(request.deadline)}</div>
          <div className="muted small request-private">
            <LockIcon size={12} color="var(--color-text-muted)" /> Budget is private
          </div>
        </div>
        {request.mine ? (
          <button type="button" className="btn btn-lg" disabled>
            You can't negotiate with yourself
          </button>
        ) : request.locked ? (
          <button type="button" className="btn btn-lg" disabled>
            Already in a negotiation
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={() => onNegotiate(request)}>
            {busy ? 'Sending...' : 'Negotiate'}
          </button>
        )}
      </div>
    </article>
  )
}
