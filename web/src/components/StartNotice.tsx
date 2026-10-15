import { Link } from 'react-router-dom'
import type { StartProblem } from '../hooks/useStartNegotiation'

/** Says what happened after "Negotiate": the proposal was sent, or why it was not. */
export default function StartNotice({ problem }: { problem: StartProblem }) {
  if (problem.kind === 'sent') {
    return (
      <div className="notice notice-success" role="status">
        Proposal sent to {problem.name}. The negotiation starts when they accept.{' '}
        <Link to="/proposals">See your proposals</Link>
      </div>
    )
  }
  if (problem.kind === 'no-request') {
    return (
      <div className="notice notice-warning" role="alert">
        Your agent needs a request to know your target and maximum price.{' '}
        <Link to="/buyer">Create a request</Link> first.
      </div>
    )
  }
  if (problem.kind === 'no-listing') {
    return (
      <div className="notice notice-warning" role="alert">
        You need a listing that is not in a negotiation to make an offer. <Link to="/seller">Go to your listings</Link>.
      </div>
    )
  }
  if (problem.kind === 'locked') {
    return (
      <div className="notice notice-warning" role="alert">
        {problem.role === 'buyer'
          ? `${problem.name} just started a negotiation with another buyer, so you can't send a proposal right now. Try another seller.`
          : "Your listing is already in a negotiation, so you can't send a proposal with it right now."}
      </div>
    )
  }
  if (problem.kind === 'request-locked') {
    return (
      <div className="notice notice-warning" role="alert">
        {problem.role === 'buyer'
          ? "That request is already in a negotiation, so you can't send another proposal for it right now. It opens up again if the negotiation ends without a deal."
          : `${problem.name} already started a negotiation for this request, so you can't send a proposal for it right now.`}
      </div>
    )
  }
  return (
    <div className="notice notice-danger" role="alert">
      {problem.message}
    </div>
  )
}
