import type {
  BuyerNegotiationRow,
  BuyerRequest,
  NewBuyerRequest,
  NewSellerListing,
  SellerActiveNegotiation,
  SellerNegotiationRow,
  SellerListing,
} from '../types/dashboard'
import type { Me, Role } from '../types/me'
import type { OpenRequest, Proposal, RequestQuery } from '../types/proposal'
import type {
  ChatMessage,
  DealApproval,
  EndedSession,
  Listing,
  Negotiation,
  Payment,
  SearchQuery,
} from '../types/marketplace'

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

  // Proposals: every negotiation starts with one, and the other side accepts or declines.
  // A person who is both buyer and seller always says which side they are acting as (`role`).
  sendProposal(input: { role: Role; listingId: string; requestId: string }): Promise<{ id: string }>
  listProposals(role: Role): Promise<Proposal[]>
  /** How many proposals wait for this side's answer (for the badge on the Proposals link). */
  countIncomingProposals(role: Role): Promise<number>
  acceptProposal(id: string): Promise<Proposal>
  declineProposal(id: string): Promise<Proposal>
  /** The sender takes back a proposal that nobody answered yet. */
  withdrawProposal(id: string): Promise<Proposal>

  // Live negotiation (buyer or seller view)
  getNegotiation(id: string): Promise<Negotiation>
  getMessages(id: string, afterId?: string): Promise<ChatMessage[]>
  /** Returns the stored message, followed by a system warning if the text looks like a price. */
  sendMessage(id: string, text: string): Promise<ChatMessage[]>

  // Approval before payment: both humans must approve the agreed price (each answer is final)
  getApproval(id: string): Promise<DealApproval>
  /** Records the caller's approval. Payment unlocks once the other side has approved too. */
  approveDeal(id: string): Promise<DealApproval>
  /** Records the caller's refusal. The deal is closed and nothing is charged. */
  declineDeal(id: string): Promise<DealApproval>

  // Payment (PayPal sandbox). Only the buyer pays, and only after both sides approved.
  getPayment(id: string): Promise<Payment>
  /** The server creates the PayPal order for the agreed price. The front end never sends an amount. */
  createPaymentOrder(id: string): Promise<{ orderId: string }>
  /** Called after the buyer approved the order in the PayPal window. The server captures it. */
  capturePayment(id: string, orderId: string): Promise<Payment>

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
  /** Every negotiation the seller has had, active or finished, so they can find it again. */
  listSellerNegotiations(): Promise<SellerNegotiationRow[]>
}
