// Shapes for the buyer and seller dashboards.
import type { NegotiationStatus } from './marketplace'

export type BuyerRequest = {
  id: string
  title: string
  category: string
  deliverables: string
  /** YYYY-MM-DD */
  deadline: string
  /** Private to the buyer. Never shown to the seller (rule 5). */
  target: number
  max: number
}

export type NewBuyerRequest = Omit<BuyerRequest, 'id'>

export type BuyerNegotiationRow = {
  id: string
  service: string
  sellerName: string
  status: NegotiationStatus
  round: number
  maxRounds: number
  buyerOffer: number
  sellerOffer: number
}

export type SellerListing = {
  id: string
  title: string
  category: string
  deliverables: string
  listPrice: number
  /** Private to the seller. Never shown to the buyer (rule 5). */
  priceFloor: number
  deliveryDays: number
}

export type NewSellerListing = Omit<SellerListing, 'id'>

export type SellerActiveNegotiation = {
  negotiationId: string
  listingId: string
  round: number
  maxRounds: number
}
