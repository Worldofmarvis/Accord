import { useParams } from 'react-router-dom'
import Badge from '../components/Badge'
import ChatPanel from '../components/ChatPanel'
import NegotiationLog from '../components/NegotiationLog'
import OfferCard from '../components/OfferCard'
import PriceRange from '../components/PriceRange'
import RoundProgress from '../components/RoundProgress'
import { getNegotiation } from '../data/mock'
import { usd } from '../lib/format'
import type { Role } from '../types/marketplace'

export default function Negotiation() {
  const { id = '' } = useParams()
  // TODO: load from the API and refresh as rounds complete.
  const n = getNegotiation(id)

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
        <ChatPanel sellerName={n.sellerName} initialMessages={n.messages} />
      </div>
    </div>
  )
}
