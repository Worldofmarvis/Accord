import Avatar from './Avatar'
import Badge from './Badge'
import ProposalSent from './ProposalSent'
import { LockIcon } from './icons'
import { formatDate } from '../lib/format'
import type { OpenRequest } from '../types/proposal'

type Props = {
  request: OpenRequest
  onNegotiate: (request: OpenRequest) => void
  /** True while the proposal is being sent. */
  busy?: boolean
  /** True once a proposal was sent for this request. */
  sent?: boolean
}

/** Whole days from today until a YYYY-MM-DD deadline (0 = today, negative = passed). */
function daysLeft(deadline: string): number {
  const [y, m, d] = deadline.split('-').map(Number)
  if (!y || !m || !d) return Number.NaN
  const end = new Date(y, m - 1, d).getTime()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((end - today) / 86_400_000)
}

function dueText(days: number): string {
  if (Number.isNaN(days)) return ''
  if (days < 0) return 'deadline passed'
  if (days === 0) return 'due today'
  if (days === 1) return 'due tomorrow'
  return `in ${days} days`
}

// One buyer, as a seller sees them: who they are and what they need. The budget is never part of it (rule 5).
export default function RequestCard({ request, onNegotiate, busy = false, sent = false }: Props) {
  const days = daysLeft(request.deadline)
  const dueSoon = days >= 0 && days <= 7

  return (
    <article className="card service-card request-card">
      <div className="service-card-body">
        <div className="request-head">
          <Avatar name={request.buyerName} src={request.buyerAvatarUrl} size={56} />
          <div className="request-who">
            <div className="request-name">{request.buyerName}</div>
            <div className="muted small">is looking for a service</div>
          </div>
          <div className="request-tags">
            <Badge tone="info">{request.category}</Badge>
            {dueSoon && <Badge tone="warning">Due soon</Badge>}
            {request.mine && <Badge tone="primary">Your request</Badge>}
            {request.locked && (
              <Badge tone="warning">
                <LockIcon size={12} />
                Locked
              </Badge>
            )}
          </div>
        </div>

        <h3>{request.title}</h3>
        <dl className="request-needs">
          <div>
            <dt>What they need</dt>
            <dd>{request.deliverables}</dd>
          </div>
          <div>
            <dt>Needed by</dt>
            <dd>
              {formatDate(request.deadline)}
              {dueText(days) && <span className="muted"> · {dueText(days)}</span>}
            </dd>
          </div>
        </dl>
      </div>

      <div className="service-card-side">
        <div className="muted small request-private">
          <LockIcon size={12} color="var(--color-text-muted)" /> Budget is private
        </div>
        {sent ? (
          <ProposalSent name={request.buyerName} />
        ) : request.mine ? (
          <button type="button" className="btn btn-lg" disabled>
            You can't negotiate with yourself
          </button>
        ) : request.locked ? (
          <button type="button" className="btn btn-lg" disabled>
            Already in a negotiation
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={() => onNegotiate(request)}>
            {busy && <span className="spinner" aria-hidden="true" />}
            {busy ? 'Sending...' : 'Negotiate'}
          </button>
        )}
      </div>
    </article>
  )
}
