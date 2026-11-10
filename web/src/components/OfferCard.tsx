import { LockIcon } from './icons'
import { usd } from '../lib/format'
import type { Offer, Role } from '../types/marketplace'

type Props = {
  /** Whose agent this card is about. */
  role: Role
  /** Which side the person looking at the page is. */
  viewerRole: Role
  currentRound: number
  offer: Offer | undefined
  /** Only the viewer's own limits are ever passed in. The other side's are never sent to the browser. */
  buyerLimits?: { target: number; max: number }
  sellerLimits?: { floor: number }
  className?: string
}

export default function OfferCard({ role, viewerRole, currentRound, offer, buyerLimits, sellerLimits, className }: Props) {
  const mine = role === viewerRole
  const title = mine ? 'Your agent' : role === 'buyer' ? 'Buyer agent' : 'Seller agent'
  return (
    <section aria-label={title} className={`card offer-card offer-card-${role}${className ? ` ${className}` : ''}`}>
      <div className="offer-card-head">
        <span className={`marker ${role === 'buyer' ? 'marker-buyer' : 'marker-seller'}`} />
        <h2>{title}</h2>
      </div>
      <div className="muted caption">{offer ? (offer.round === currentRound ? 'Latest offer' : `Latest offer (Round ${offer.round})`) : 'No offer yet'}</div>
      <div className="offer-card-amount">{offer ? usd(offer.amount) : '–'}</div>
      {offer && <p className="small offer-card-note">{offer.note}</p>}
      {mine && role === 'buyer' && buyerLimits ? (
        <div className="callout callout-info">
          <div className="callout-title">
            Your limits: target {usd(buyerLimits.target)}, max {usd(buyerLimits.max)}
          </div>
          <div className="muted caption">Only you can see this. The engine will not accept a price above your max.</div>
        </div>
      ) : mine && role === 'seller' && sellerLimits ? (
        <div className="callout callout-info">
          <div className="callout-title">Your limit: price floor {usd(sellerLimits.floor)}</div>
          <div className="muted caption">Only you can see this. The engine will not accept a price below your floor.</div>
        </div>
      ) : (
        <div className="callout callout-muted">
          <LockIcon size={16} color="var(--color-text-muted)" />
          <span className="muted">The {role}'s limits are private.</span>
        </div>
      )}
    </section>
  )
}
