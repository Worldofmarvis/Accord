import { usd } from '../lib/format'
import type { Offer, Role } from '../types/marketplace'

type Props = {
  offers: Offer[]
  viewerRole: Role
  /** The viewer's own limit: a buyer's maximum or a seller's floor. */
  limit: number
}

// Plots every accepted offer on one line, plus the viewer's own limit.
export default function PriceRange({ offers, viewerRole, limit }: Props) {
  const limitName = viewerRole === 'buyer' ? 'max' : 'floor'
  const buyerMax = limit
  const amounts = offers.map((o) => o.amount)
  const lo = Math.floor(Math.min(...amounts, buyerMax) / 50) * 50
  const hi = Math.max(...amounts, buyerMax) + 20
  const pos = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`

  return (
    <section aria-label="Price range" className="card">
      <h2 className="card-title">Price range</h2>
      <p className="muted small">
        Offers so far, from {usd(Math.min(...amounts))} to {usd(Math.max(...amounts))}.
      </p>
      <div className="price-range">
        <div className="price-range-line" />

        <div className="price-range-max" style={{ left: pos(buyerMax) }} />
        <div className="price-range-label price-range-label-max" style={{ left: pos(buyerMax) }}>
          Your {limitName} {usd(buyerMax)}
        </div>

        {offers.map((o) => {
          // Every other label of the same side sits a little further out, so close offers never overlap.
          const alt = offers.filter((x) => x.role === o.role && x.round < o.round).length % 2 === 1
          return (
          <div key={`${o.round}-${o.role}`}>
            <div
              className={`price-range-dot ${o.role === 'buyer' ? 'marker-buyer' : 'marker-seller'}`}
              style={{ left: pos(o.amount) }}
            />
            <div
              className={`price-range-label ${o.role === 'buyer' ? 'is-below' : 'is-above'}${alt ? ' is-alt' : ''}`}
              style={{ left: pos(o.amount) }}
            >
              R{o.round} {usd(o.amount)}
            </div>
          </div>
          )
        })}

        <div className="price-range-end price-range-end-lo">{usd(lo)}</div>
        <div className="price-range-end price-range-end-hi">{usd(hi)}</div>
      </div>
      <div className="price-range-legend muted caption">
        <span>
          <span className="marker marker-buyer" /> {viewerRole === 'buyer' ? 'Your agent' : 'Buyer agent'}
        </span>
        <span>
          <span className="marker marker-seller" /> {viewerRole === 'seller' ? 'Your agent' : 'Seller agent'}
        </span>
        <span>
          <span className="legend-dash" /> Your {limitName} (only you can see this)
        </span>
      </div>
    </section>
  )
}
