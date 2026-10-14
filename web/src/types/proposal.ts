// Shapes for proposals (how a negotiation starts) and for sellers searching buyer needs.
// These match docs/API.md.

/** "withdrawn": the side that sent it took it back. "declined" can also be automatic, see `closedReason`. */
export type ProposalStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn'

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
  /**
   * "taken": the server declined it by itself because its listing or its request went into
   * another negotiation. Null for answers a person gave.
   */
  closedReason: 'taken' | null
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
  /** True while this request is in a negotiation, so a new proposal for it is refused. */
  locked: boolean
  /** True when the signed-in person owns it. A person can't negotiate with themselves. */
  mine: boolean
}

export type RequestSort = 'match' | 'deadline'

export type RequestQuery = {
  keyword: string
  /** Empty string means every category. */
  category: string
  sort: RequestSort
}
