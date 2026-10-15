import { lazy, Suspense, useState } from 'react'
import type { Negotiation } from '../types/marketplace'
import GridBoundary from './GridBoundary'
import NegotiationLog from './NegotiationLog'

const OfferHistoryGrid = lazy(() => import('./OfferHistoryGrid'))

type View = 'table' | 'timeline'

/** The offers so far: an AG Studio table to sort and filter, or the timeline with the engine's notes. */
export default function OfferHistory({ negotiation, className }: { negotiation: Negotiation; className?: string }) {
  const [view, setView] = useState<View>('table')
  const timeline = <NegotiationLog negotiation={negotiation} embedded />

  return (
    <section aria-label="Offer history" className={`card${className ? ` ${className}` : ''}`}>
      <div className="offer-history-head">
        <h2 className="card-title">Offer history</h2>
        <div className="offer-history-toggle" role="group" aria-label="View">
          {(['table', 'timeline'] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={`chip${view === v ? ' is-active' : ''}`}
              aria-pressed={view === v}
              onClick={() => setView(v)}
            >
              {v === 'table' ? 'Table' : 'Timeline'}
            </button>
          ))}
        </div>
      </div>

      {view === 'timeline' ? (
        timeline
      ) : (
        <GridBoundary
          fallback={
            <>
              <p className="muted small">The table could not load, so here is the timeline.</p>
              {timeline}
            </>
          }
        >
          <Suspense fallback={<p className="muted" role="status">Loading the table...</p>}>
            <OfferHistoryGrid negotiation={negotiation} />
          </Suspense>
        </GridBoundary>
      )}
    </section>
  )
}
