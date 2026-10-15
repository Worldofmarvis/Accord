import { Link } from 'react-router-dom'
import { useRole } from '../role/useRole'
import { CheckIcon } from './icons'

/**
 * What a card shows in place of its "Negotiate" button once the proposal went out.
 * It offers the two obvious next steps: see the proposal, or go back to the dashboard.
 */
export default function ProposalSent({ name }: { name: string }) {
  const { role } = useRole()
  return (
    <div className="proposal-sent" role="status">
      <div className="proposal-sent-head">
        <span className="proposal-sent-check">
          <CheckIcon size={14} />
        </span>
        <strong>Proposal sent</strong>
      </div>
      <p className="muted small">The negotiation starts when {name} accepts.</p>
      <div className="proposal-sent-actions">
        <Link to="/proposals" className="btn btn-primary">
          View proposals
        </Link>
        <Link to={role === 'buyer' ? '/buyer' : '/seller'} className="btn btn-secondary">
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
