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

/**
 * Where a deal ended up, for the seller's sales history:
 * "paid" is a sale. "awaiting_approval" and "awaiting_payment" are agreed but not finished.
 * "declined" is a deal that a person refused after the agents agreed. "no_agreement" ended without a price.
 */
export type SaleOutcome = 'paid' | 'awaiting_approval' | 'awaiting_payment' | 'declined' | 'no_agreement'

/** One finished or settled negotiation of the seller, as a row of the sales history. Active ones are not included. */
export type SellerSale = {
  /** The negotiation id. */
  id: string
  /** ISO 8601. When it was paid; otherwise when it was agreed, declined or ended. */
  date: string
  service: string
  buyerName: string
  listPrice: number
  /** The seller's own price floor for that listing. Private to the seller, so it is fine here. Never the buyer's limits. */
  priceFloor: number
  /** The price the agents settled on. Null when the outcome is "no_agreement". */
  agreedPrice: number | null
  /** How many rounds it took (1 to 3). */
  rounds: number
  outcome: SaleOutcome
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
