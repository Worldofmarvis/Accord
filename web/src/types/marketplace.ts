// Shapes shared by the Search, Negotiation and NoAgreement screens.
// These match the responses described in docs/API.md.

export type Listing = {
  id: string
  title: string
  sellerName: string
  description: string
  categories: string[]
  /** Extra search words, so a listing can match a keyword its text doesn't contain. */
  tags: string[]
  listPrice: number
  deliveryDays: number
  /** True while another buyer has an active negotiation with this seller. */
  locked: boolean
}

export type Role = 'buyer' | 'seller'

export type Offer = {
  round: number
  role: Role
  amount: number
  note: string
  /** Set when the engine rejected the agent's original proposal and replaced it. */
  blocked?: { proposed: number; reason: string }
}

export type ChatMessage =
  | { id: string; from: Role; /** ISO 8601 time */ sentAt: string; text: string }
  | { id: string; from: 'system'; tone: 'note' | 'warning'; text: string }

export type NegotiationStatus = 'active' | 'agreed' | 'no_agreement'

export type Negotiation = {
  id: string
  status: NegotiationStatus
  service: string
  sellerName: string
  /** Sent in the seller's view only. */
  buyerName?: string
  listPrice: number
  round: number
  maxRounds: number
  /** Only the buyer's own limits, and only in the buyer's view. The seller's view has none (docs/API.md). */
  buyerLimits?: { target: number; max: number }
  /** Set when `status` is "agreed", otherwise null. */
  agreedPrice: number | null
  offers: Offer[]
  /** Whose counter-offer is awaited right now. */
  waitingOn: Role | null
}

export type RematchSuggestion = {
  listingId: string
  title: string
  sellerName: string
  listPrice: number
  reasons: string[]
}

export type EndedSession = {
  id: string
  service: string
  sellerName: string
  rounds: { round: number; buyer: number; seller: number }[]
  rematches: RematchSuggestion[]
}

export type SearchSort = 'match' | 'price' | 'delivery'

export type SearchQuery = {
  keyword: string
  /** Empty string means every category. */
  category: string
  /** Null means no limit. */
  maxPrice: number | null
  sort: SearchSort
}
