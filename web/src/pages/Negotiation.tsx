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
import { useRole } from '../role/useRole'
import type { Role } from '../types/marketplace'

export default function Negotiation() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { role } = useRole()
  const isBuyer = role === 'buyer'
  const { negotiation: n, error, loading, retry } = useNegotiation(id)

  // When the negotiation ends, move the buyer on to the matching screen.
  // The seller stays here: the pay and rematch screens are the buyer's.
  const status = n?.status
  useEffect(() => {
    if (!isBuyer) return
    const path = `/negotiations/${encodeURIComponent(id)}`
    if (status === 'agreed') navigate(`${path}/pay`, { replace: true })
    if (status === 'no_agreement') navigate(`${path}/no-agreement`, { replace: true })
  }, [status, id, isBuyer, navigate])

  if (!n) {
    return (
      <div className="page-stack">
        {loading ? <LoadingCard label="Loading the negotiation..." /> : <ErrorCard error={error} onRetry={retry} />}
      </div>
    )
  }

  if (isBuyer && n.status !== 'active') {
    return (
      <div className="page-stack">
        <LoadingCard label="This negotiation has ended. Taking you to the result..." />
      </div>
    )
  }

  const latest = (r: Role) => [...n.offers].reverse().find((o) => o.role === r)
  const counterpartName = isBuyer ? n.sellerName : (n.buyerName ?? 'the buyer')

  return (
    <div className="page-stack page-wide">
      <div className="neg-head">
        <div>
          <h1>{n.service}</h1>
          <p className="muted">
            Negotiating with {counterpartName}. List price {usd(n.listPrice)}.
          </p>
        </div>
        <div className="neg-status">
          {n.status === 'active' && <Badge tone="info">Negotiation active</Badge>}
          {n.status === 'agreed' && <Badge tone="success">Agreement reached{n.agreedPrice != null && ` at ${usd(n.agreedPrice)}`}</Badge>}
          {n.status === 'no_agreement' && <Badge tone="warning">No agreement</Badge>}
          {n.status === 'active' && (
            <span className="muted caption">
              {isBuyer ? 'This seller is locked for other buyers' : 'Your listing is locked for other buyers'}
            </span>
          )}
          {!isBuyer && n.status !== 'active' && <Link to="/seller">Back to your dashboard</Link>}
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
          {/* The agents' cards and the price chart use the buyer's limits, so only the buyer's view has them. */}
          {isBuyer && n.buyerLimits && (
            <>
              <div className="neg-agents">
                <OfferCard role="buyer" currentRound={n.round} offer={latest('buyer')} limits={n.buyerLimits} />
                <OfferCard role="seller" currentRound={n.round} offer={latest('seller')} />
              </div>
              <PriceRange offers={n.offers} buyerMax={n.buyerLimits.max} />
            </>
          )}
          <NegotiationLog negotiation={n} viewer={role} />
        </div>
        <ChatPanel negotiationId={n.id} role={role} counterpartName={counterpartName} />
      </div>
    </div>
  )
}
