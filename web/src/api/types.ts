import type {
  BuyerNegotiationRow,
  BuyerRequest,
  NewBuyerRequest,
  NewSellerListing,
  SellerActiveNegotiation,
  SellerListing,
} from '../types/dashboard'
import type { Me } from '../types/me'
import type { OpenRequest, Proposal, RequestQuery } from '../types/proposal'
import type { ChatMessage, EndedSession, Listing, Negotiation, SearchQuery } from '../types/marketplace'

/**
 * Every call the screens make to the server. There are two implementations with
 * exactly this shape: `real.ts` (the back end) and `mock.ts` (built-in demo data).
 * The endpoints are described in docs/API.md.
 */
export interface Api {
  // Who is signed in
  getMe(): Promise<Me>

  // Search: buyers search seller listings, sellers search buyer requests
  searchListings(query: SearchQuery): Promise<Listing[]>
  searchRequests(query: RequestQuery): Promise<OpenRequest[]>

  // Proposals: every negotiation starts with one, and the other side accepts or declines
  sendProposal(input: { listingId: string; requestId: string }): Promise<{ id: string }>
  listProposals(): Promise<Proposal[]>
  acceptProposal(id: string): Promise<Proposal>
  declineProposal(id: string): Promise<Proposal>

  // Live negotiation (buyer or seller view)
  getNegotiation(id: string): Promise<Negotiation>
  getMessages(id: string, afterId?: string): Promise<ChatMessage[]>
  /** Returns the stored message, followed by a system warning if the text looks like a price. */
  sendMessage(id: string, text: string): Promise<ChatMessage[]>

  // Session ended
  getOutcome(id: string): Promise<EndedSession>

  // Buyer dashboard
  listBuyerRequests(): Promise<BuyerRequest[]>
  createBuyerRequest(input: NewBuyerRequest): Promise<BuyerRequest>
  listBuyerNegotiations(): Promise<BuyerNegotiationRow[]>

  // Seller dashboard
  listSellerListings(): Promise<SellerListing[]>
  createSellerListing(input: NewSellerListing): Promise<SellerListing>
  updateSellerListing(id: string, input: NewSellerListing): Promise<SellerListing>
  getSellerActiveNegotiation(): Promise<SellerActiveNegotiation | null>
}
