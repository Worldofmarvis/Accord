import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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

  // When the negotiation ends, move the buyer on to the matching screen.
  const status = n?.status
  useEffect(() => {
    const path = `/negotiations/${encodeURIComponent(id)}`
    if (status === 'agreed') navigate(`${path}/pay`, { replace: true })
    if (status === 'no_agreement') navigate(`${path}/no-agreement`, { replace: true })
  }, [status, id, navigate])

  if (!n) {
    return (
      <div className="page-stack">
        {loading ? <LoadingCard label="Loading your negotiation..." /> : <ErrorCard error={error} onRetry={retry} />}
      </div>
    )
  }

  if (n.status !== 'active') {
    return (
      <div className="page-stack">
        <LoadingCard label="This negotiation has ended. Taking you to the result..." />
      </div>
    )
  }

  const latest = (role: Role) => [...n.offers].reverse().find((o) => o.role === role)

  return (
    <div className="page-stack page-wide">
      <div className="neg-head">
        <div>
          <h1>{n.service}</h1>
          <p className="muted">
            Negotiating with {n.sellerName}. List price {usd(n.listPrice)}.
          </p>
        </div>
        <div className="neg-status">
          <Badge tone="info">Negotiation active</Badge>
          <span className="muted caption">This seller is locked for other buyers</span>
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
            <OfferCard role="buyer" currentRound={n.round} offer={latest('buyer')} limits={n.buyerLimits} />
            <OfferCard role="seller" currentRound={n.round} offer={latest('seller')} />
          </div>
          <PriceRange offers={n.offers} buyerMax={n.buyerLimits.max} />
          <NegotiationLog negotiation={n} />
        </div>
        <ChatPanel negotiationId={n.id} sellerName={n.sellerName} />
      </div>
    </div>
  )
}
