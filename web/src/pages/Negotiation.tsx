import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { errorMessage } from '../api'
import { isFinalError } from '../api/errors'
import Badge from '../components/Badge'
import ChatPanel from '../components/ChatPanel'
import NegotiationLog from '../components/NegotiationLog'
import OfferCard from '../components/OfferCard'
import PriceRange from '../components/PriceRange'
import RoundProgress from '../components/RoundProgress'
import { ErrorCard, LoadingCard } from '../components/StateCards'
import { useNegotiation } from '../hooks/useNegotiation'
import { usd } from '../lib/format'
import type { Role } from '../types/marketplace'

export default function Negotiation() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { negotiation: n, error, loading, retry } = useNegotiation(id)

  // When the negotiation ends, move a buyer on to the matching screen. A seller stays here and sees the result.
  const status = n?.status
  const viewerRole = n?.viewerRole
  useEffect(() => {
    if (viewerRole !== 'buyer') return
    const path = `/negotiations/${encodeURIComponent(id)}`
    if (status === 'agreed') navigate(`${path}/pay`, { replace: true })
    if (status === 'no_agreement') navigate(`${path}/no-agreement`, { replace: true })
  }, [status, viewerRole, id, navigate])

  if (!n) {
    return (
      <div className="page-stack">
        {loading ? <LoadingCard label="Loading your negotiation..." /> : <ErrorCard error={error} onRetry={retry} />}
      </div>
    )
  }

  if (n.status !== 'active') {
    if (n.viewerRole === 'buyer') {
      return (
        <div className="page-stack">
          <LoadingCard label="This negotiation has ended. Taking you to the result..." />
        </div>
      )
    }
    return (
      <div className="page-stack">
        <section aria-label="Result" className="card">
          {n.status === 'agreed' ? (
            <>
              <h1>You reached an agreement</h1>
              <p>
                {n.service} with {n.counterpartName}
                {n.agreedPrice != null && <> at {usd(n.agreedPrice)}</>}. The buyer now reviews the agreed price and
                pays. Nothing is final until they approve.
              </p>
            </>
          ) : (
            <>
              <h1>No agreement</h1>
              <p>
                The negotiation with {n.counterpartName} ended after {n.maxRounds} rounds. Nothing was charged, and
                your listing is open to new proposals again.
              </p>
            </>
          )}
          <Link to="/seller" className="btn btn-secondary btn-lg">
            Back to my listings
          </Link>
        </section>
      </div>
    )
  }

  const viewer = n.viewerRole
  const latest = (role: Role) => [...n.offers].reverse().find((o) => o.role === role)
  const limit = viewer === 'buyer' ? n.buyerLimits?.max : n.sellerLimits?.floor

  return (
    <div className="page-stack page-wide">
      <div className="neg-head">
        <div>
          <h1>{n.service}</h1>
          <p className="muted">
            Negotiating with {n.counterpartName}. {viewer === 'seller' ? 'Your list price' : 'List price'}{' '}
            {usd(n.listPrice)}.
          </p>
        </div>
        <div className="neg-status">
          <Badge tone="info">Negotiation active</Badge>
          <span className="muted caption">
            {viewer === 'buyer' ? 'This seller is locked for other buyers' : 'Your listing is locked for other buyers'}
          </span>
        </div>
      </div>

      {error != null && (
        <div className="notice notice-warning notice-inline" role="status">
          {isFinalError(error)
            ? errorMessage(error)
            : "We can't reach the server right now. You're seeing the last update, and we'll keep trying."}
        </div>
      )}

      <RoundProgress round={n.round} maxRounds={n.maxRounds} />

      <div className="neg-layout">
        <div className="neg-main">
          <div className="neg-agents">
            {(['buyer', 'seller'] as const).map((role) => (
              <OfferCard
                key={role}
                role={role}
                viewerRole={viewer}
                currentRound={n.round}
                offer={latest(role)}
                buyerLimits={n.buyerLimits}
                sellerLimits={n.sellerLimits}
              />
            ))}
          </div>
          {limit != null && <PriceRange offers={n.offers} viewerRole={viewer} limit={limit} />}
          <NegotiationLog negotiation={n} />
        </div>
        <ChatPanel negotiationId={n.id} counterpartName={n.counterpartName} viewerRole={viewer} />
      </div>
    </div>
  )
}
