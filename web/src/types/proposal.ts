// Shapes for proposals (how a negotiation starts) and for sellers searching buyer needs.
// These match docs/API.md.

export type ProposalStatus = 'pending' | 'accepted' | 'declined'

export type Proposal = {
  id: string
  /** Relative to the person looking: "incoming" = the other side sent it, "outgoing" = they sent it. */
  direction: 'incoming' | 'outgoing'
  status: ProposalStatus
  /** ISO 8601 time */
  createdAt: string
  /** Public facts about the listing. Never includes the seller's price floor. */
  listing: { id: string; title: string; sellerName: string; listPrice: number }
  /** Public facts about the request. Never includes the buyer's target or maximum. */
  request: { id: string; title: string; buyerName: string; deliverables: string; deadline: string }
  /** Set once the proposal is accepted. Open it at /negotiations/:id. */
  negotiationId: string | null
}

/** What a seller sees when searching what buyers need. Public fields only: no budget. */
export type OpenRequest = {
  id: string
  title: string
  buyerName: string
  category: string
  deliverables: string
  /** YYYY-MM-DD */
  deadline: string
}

export type RequestSort = 'match' | 'deadline'

export type RequestQuery = {
  keyword: string
  /** Empty string means every category. */
  category: string
  sort: RequestSort
}
