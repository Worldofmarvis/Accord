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
  /** True when the signed-in person owns it. A person can't negotiate with themselves. */
  mine: boolean
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
  /** Which side the person looking at it is. */
  viewerRole: Role
  service: string
  /** The seller's name for a buyer, the buyer's name for a seller. */
  counterpartName: string
  listPrice: number
  round: number
  maxRounds: number
  /** The viewer's own limits only, never the other side's. A buyer gets `buyerLimits`, a seller gets `sellerLimits`. */
  buyerLimits?: { target: number; max: number }
  sellerLimits?: { floor: number }
  /** Set when `status` is "agreed", otherwise null. */
  agreedPrice: number | null
  offers: Offer[]
  /** Whose counter-offer is awaited right now. */
  waitingOn: Role | null
}

/** One side's answer to the agreed price. Final once it is "approved" or "declined". */
export type Decision = 'pending' | 'approved' | 'declined'

/** The deal as a whole: "approved" only when both sides approved, "declined" as soon as either side declines. */
export type ApprovalStatus = 'pending' | 'approved' | 'declined'

/**
 * Both humans' decisions on an agreed price. Shared state: the buyer and the seller see the same
 * object, and payment stays locked until `status` is "approved". Not private (unlike limits).
 */
export type DealApproval = {
  negotiationId: string
  agreedPrice: number
  buyer: Decision
  seller: Decision
  status: ApprovalStatus
}

/** Whether the buyer has paid the agreed price. Set by the server after PayPal confirms the capture. */
export type PaymentStatus = 'unpaid' | 'paid'

/** The payment for an agreed deal. `orderId`, `captureId` and `paidAt` are null until it is paid. */
export type Payment = {
  negotiationId: string
  status: PaymentStatus
  /** Whole US dollars, always the deal's `agreedPrice` (the server sets it, the front end never sends it). */
  amount: number
  orderId: string | null
  captureId: string | null
  paidAt: string | null
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
