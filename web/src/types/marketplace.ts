// Shapes shared by the Search, Negotiation and NoAgreement screens.
// When the API exists, these should match its responses.

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
  | { id: string; from: Role; time: string; text: string }
  | { id: string; from: 'system'; tone: 'note' | 'warning'; text: string }

export type Negotiation = {
  id: string
  service: string
  sellerName: string
  listPrice: number
  round: number
  maxRounds: number
  /** Only the buyer's own limits are ever sent to the buyer's browser. */
  buyerLimits: { target: number; max: number }
  offers: Offer[]
  /** Whose counter-offer is awaited right now. */
  waitingOn: Role | null
  messages: ChatMessage[]
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
