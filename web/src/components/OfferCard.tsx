import { LockIcon } from './icons'
import { usd } from '../lib/format'
import type { Offer, Role } from '../types/marketplace'

type Props = {
  role: Role
  currentRound: number
  offer: Offer | undefined
  /** Buyer view only. The seller's limits are never passed to this component. */
  limits?: { target: number; max: number }
}

export default function OfferCard({ role, currentRound, offer, limits }: Props) {
  const isBuyer = role === 'buyer'
  const title = isBuyer ? 'Your agent' : 'Seller agent'
  return (
    <section aria-label={title} className="card offer-card">
      <div className="offer-card-head">
        <span className={`marker ${isBuyer ? 'marker-buyer' : 'marker-seller'}`} />
        <h2>{title}</h2>
      </div>
      <div className="muted caption">{offer ? (offer.round === currentRound ? 'Latest offer' : `Latest offer (Round ${offer.round})`) : 'No offer yet'}</div>
      <div className="offer-card-amount">{offer ? usd(offer.amount) : '–'}</div>
      {offer && <p className="small offer-card-note">{offer.note}</p>}
      {isBuyer && limits ? (
        <div className="callout callout-info">
          <div className="callout-title">
            Your limits: target {usd(limits.target)}, max {usd(limits.max)}
          </div>
          <div className="muted caption">Only you can see this. The engine will not accept a price above your max.</div>
        </div>
      ) : (
        <div className="callout callout-muted">
          <LockIcon size={16} color="var(--color-text-muted)" />
          <span className="muted">The seller's limits are private.</span>
        </div>
      )}
    </section>
  )
}
