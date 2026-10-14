import Badge from './Badge'
import { usd } from '../lib/format'
import type { Negotiation } from '../types/marketplace'

type Props = { negotiation: Negotiation }

// Every offer is shown with the engine's verdict (rule 1: the engine enforces limits).
export default function NegotiationLog({ negotiation }: Props) {
  const { offers, round, waitingOn, viewerRole } = negotiation
  const agentName = (role: 'buyer' | 'seller') =>
    role === viewerRole ? 'Your agent' : role === 'buyer' ? 'Buyer agent' : 'Seller agent'
  const sorted = [...offers].sort((a, b) => a.round - b.round || (a.role === 'buyer' ? -1 : 1))
  const tone = (r: number) => (r === round ? 'info' : 'neutral')

  return (
    <section aria-label="Negotiation log" className="card">
      <h2 className="card-title">Negotiation log</h2>
      <p className="muted small">Every offer is checked by the engine before it counts.</p>

      {sorted.map((o) => (
        <div key={`${o.round}-${o.role}`} className="log-row">
          <div className="log-round">
            <Badge tone={tone(o.round)}>Round {o.round}</Badge>
          </div>
          <div className="log-body">
            <div className="log-title-row">
              <span className="log-title">
                {agentName(o.role)} offered {usd(o.amount)}
              </span>
              {!o.blocked && <span className="log-pass">Engine check: passed</span>}
            </div>
            <p className="muted small log-note">{o.note}</p>
            {o.blocked && (
              <div className="callout callout-danger" role="status">
                <strong>Engine blocked an offer.</strong> The {o.role === 'buyer' ? 'buyer' : 'seller'} agent proposed{' '}
                {usd(o.blocked.proposed)}, which is {o.blocked.reason}. The engine set the offer to {usd(o.amount)}.
              </div>
            )}
          </div>
        </div>
      ))}

      {waitingOn && (
        <div className="log-row">
          <div className="log-round">
            <Badge tone="info">Round {round}</Badge>
          </div>
          <div className="log-body">
            <div className="callout callout-pending">
              Waiting for {waitingOn === viewerRole ? "your agent's" : `the ${waitingOn} agent's`} counter-offer...
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
