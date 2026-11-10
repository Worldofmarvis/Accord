import type { Negotiation } from '../types/marketplace'
import NegotiationLog from './NegotiationLog'

/** The offers so far, as a timeline with the engine's verdict and notes for each one. */
export default function OfferHistory({ negotiation, className }: { negotiation: Negotiation; className?: string }) {
  return (
    <section aria-label="Offer history" className={`card${className ? ` ${className}` : ''}`}>
      <div className="offer-history-head">
        <h2 className="card-title">Offer history</h2>
      </div>
      <NegotiationLog negotiation={negotiation} embedded />
    </section>
  )
}
