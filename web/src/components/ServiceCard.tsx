import Badge from './Badge'
import { LockIcon } from './icons'
import { usd } from '../lib/format'
import type { Listing } from '../types/marketplace'

type Props = {
  listing: Listing
  onNegotiate: (listing: Listing) => void
  /** True while the proposal is being sent. */
  busy?: boolean
}

// One search result. A locked seller already has an active negotiation (rule 3).
export default function ServiceCard({ listing, onNegotiate, busy = false }: Props) {
  return (
    <article className="card service-card">
      <div className="service-card-body">
        <div className="service-card-tags">
          {listing.categories.map((c, i) => (
            <Badge key={c} tone={i === 0 ? 'info' : 'neutral'}>
              {c}
            </Badge>
          ))}
          {listing.mine && <Badge tone="primary">Your listing</Badge>}
          {listing.locked && (
            <Badge tone="warning">
              <LockIcon size={12} />
              Locked
            </Badge>
          )}
        </div>
        <h3>{listing.title}</h3>
        <p className="muted service-card-seller">{listing.sellerName}</p>
        <p>{listing.description}</p>
      </div>
      <div className="service-card-side">
        <div className="service-card-price">
          <div className="muted caption">List price</div>
          <div className="service-card-amount">{usd(listing.listPrice)}</div>
          <div className="muted small">Delivery in {listing.deliveryDays} days</div>
        </div>
        {listing.mine ? (
          <button type="button" className="btn btn-lg" disabled>
            You can't negotiate with yourself
          </button>
        ) : listing.locked ? (
          <button type="button" className="btn btn-lg" disabled>
            In negotiation with another buyer
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={() => onNegotiate(listing)}>
            {busy ? 'Sending...' : 'Negotiate'}
          </button>
        )}
      </div>
    </article>
  )
}
