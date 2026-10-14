// Shapes for the buyer and seller dashboards.
import type { ApprovalStatus, NegotiationStatus } from './marketplace'

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
  /** True while the request is in a negotiation. It can't be used in another proposal until that ends. */
  locked: boolean
}

export type NewBuyerRequest = Omit<BuyerRequest, 'id' | 'locked'>

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

/** One row of a seller's negotiation history: active, agreed and ended ones, newest first. */
export type SellerNegotiationRow = {
  id: string
  service: string
  buyerName: string
  status: NegotiationStatus
  round: number
  maxRounds: number
  buyerOffer: number
  sellerOffer: number
  /** The price both agents settled on. Null unless `status` is "agreed". */
  agreedPrice: number | null
  /** Where the humans' approval stands once agreed (see "Approval before payment"). Null unless `status` is "agreed". */
  deal: ApprovalStatus | null
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
