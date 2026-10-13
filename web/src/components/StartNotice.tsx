import { Link } from 'react-router-dom'
import type { StartProblem } from '../hooks/useStartNegotiation'

/** Explains why "Negotiate" did not open a negotiation. */
export default function StartNotice({ problem }: { problem: StartProblem }) {
  if (problem.kind === 'no-request') {
    return (
      <div className="notice notice-warning" role="alert">
        Your agent needs a request to know your target and maximum price.{' '}
        <Link to="/buyer">Create a request</Link> first.
      </div>
    )
  }
  if (problem.kind === 'locked') {
    return (
      <div className="notice notice-warning" role="alert">
        {problem.sellerName} just started a negotiation with another buyer, so you can't start one right now. Try
        another seller.
      </div>
    )
  }
  return (
    <div className="notice notice-danger" role="alert">
      {problem.message}
    </div>
  )
}
