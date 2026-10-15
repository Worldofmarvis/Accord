// Built-in demo "server": answers every Api call from the single demo scenario in
// src/data, in memory. Used when VITE_USE_MOCK is not "false". Reloading the page resets it.
import { ApiError } from './errors'
import type { Api } from './types'
import { approvalStatus } from '../lib/approval'
import { relevance } from '../lib/search'
import {
  DEFAULT_BUYER_DEAL,
  DEFAULT_SELLER_DEAL,
  ENDED_BUYER_DEAL,
  DEMO_AGREED_ID,
  DEMO_ENDED_ID,
  DEMO_NEGOTIATION_ID,
  DEMO_SELLER_ENDED_ID,
  DEMO_SELLER_NEGOTIATION_ID,
  demoAgreedNegotiation,
  demoEndedNegotiation,
  demoEndedSession,
  demoMessagesFor,
  demoNegotiation,
  demoSellerEndedNegotiation,
  demoSellerNegotiation,
  listings,
  openRequests,
  type DealInfo,
} from '../data/mock'
import {
  buyerNegotiations,
  initialBuyerRequests,
  initialSellerListings,
  sellerActiveNegotiation,
  sellerNegotiations,
  sellerSales,
} from '../data/dashboardMock'
import type { BuyerRequest, SaleOutcome, SellerListing, SellerSale } from '../types/dashboard'
import type { ChatMessage, DealApproval, Decision, Listing, Payment, SearchQuery } from '../types/marketplace'
import type { Role } from '../types/me'
import type { OpenRequest, Proposal, RequestQuery } from '../types/proposal'

const delay = (ms = 250) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// Looks like someone is trying to set a price in chat (rule 5: chat never changes the price).
const PRICE_PATTERN = /\$\s?\d|\b\d+\s?(usd|dollars)\b/i
const PRICE_WARNING = "Prices can't be changed in chat. Your agent makes offers through the negotiation."

// In-memory state, so things the user adds during a demo show up on the other screens.
// Each negotiation has its own chat, about its own service.
const chats = new Map<string, ChatMessage[]>()
const chatOf = (id: string): ChatMessage[] => {
  let list = chats.get(id)
  if (!list) {
    list = demoMessagesFor(dealOf(id).service)
    chats.set(id, list)
  }
  return list
}
let buyerRequests: BuyerRequest[] = [...initialBuyerRequests]
let sellerListings: SellerListing[] = [...initialSellerListings]
let counter = 0
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${++counter}`

function filterListings(items: Listing[], q: SearchQuery): Listing[] {
  const scored = items
    .filter((l) => (!q.category || l.categories.includes(q.category)) && (q.maxPrice === null || l.listPrice <= q.maxPrice))
    .map((l) => ({
      l,
      score: relevance(q.keyword, [
        { text: l.title, weight: 5 },
        { text: l.tags.join(' '), weight: 4 },
        { text: l.categories.join(' '), weight: 3 },
        { text: l.description, weight: 2 },
        { text: l.sellerName, weight: 1 },
      ]),
    }))
    .filter((x): x is { l: Listing; score: number } => x.score !== null)
  // "Best match" ranks by relevance; the sort is stable, so equal scores keep their original order.
  if (q.sort === 'price') scored.sort((a, b) => a.l.listPrice - b.l.listPrice)
  else if (q.sort === 'delivery') scored.sort((a, b) => a.l.deliveryDays - b.l.deliveryDays)
  else scored.sort((a, b) => b.score - a.score)
  return scored.map((x) => x.l)
}

// ---- Who is looking. The real back end knows from the login; the demo is told by the header switch.
let demoRole: Role = 'buyer'
export function setMockRole(role: Role) {
  demoRole = role
}

const DEMO_NAME = 'Alex Morgan'
/** How long the demo counterpart takes to accept a proposal you sent. */
const SIM_ACCEPT_MS = 4000

type MockProposal = Omit<Proposal, 'direction'> & { forRole: Role; initiatedBy: Role }

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()
const negotiationFor = (role: Role) => (role === 'buyer' ? DEMO_NEGOTIATION_ID : DEMO_SELLER_NEGOTIATION_ID)

// What a proposal shows about each side. Only public fields: never a target, maximum or floor.
function listingInfo(role: Role, id: string): Proposal['listing'] | undefined {
  if (role === 'buyer') {
    const l = listings.find((x) => x.id === id)
    return l && { id: l.id, title: l.title, sellerName: l.sellerName, listPrice: l.listPrice }
  }
  const l = sellerListings.find((x) => x.id === id)
  return l && { id: l.id, title: l.title, sellerName: DEMO_NAME, listPrice: l.listPrice }
}

function requestInfo(role: Role, id: string): Proposal['request'] | undefined {
  if (role === 'buyer') {
    const r = buyerRequests.find((x) => x.id === id)
    return r && { id: r.id, title: r.title, buyerName: DEMO_NAME, deliverables: r.deliverables, deadline: r.deadline }
  }
  const r = openRequests.find((x) => x.id === id)
  return r && { id: r.id, title: r.title, buyerName: r.buyerName, deliverables: r.deliverables, deadline: r.deadline }
}

// Listings and requests that went into a negotiation by accepting a proposal. Ids only mean something
// next to a side (the demo person is both buyer and seller), so the keys start with the role.
const lockedListings = new Set<string>()
const lockedRequests = new Set<string>()
const lockKey = (role: Role, id: string) => `${role}:${id}`

// A seller is locked while another negotiation is active (rule 4).
function isLocked(role: Role, listingId: string): boolean {
  if (lockedListings.has(lockKey(role, listingId))) return true
  return role === 'buyer'
    ? Boolean(listings.find((l) => l.id === listingId)?.locked)
    : sellerActiveNegotiation?.listingId === listingId
}

// A buyer's request is locked the same way: one negotiation at a time.
const isRequestLocked = (role: Role, requestId: string) => lockedRequests.has(lockKey(role, requestId))

// Nobody can negotiate with themselves: the listing and the request belong to the same person.
function isSelfDeal(role: Role, listingId: string, requestId: string): boolean {
  const ownListing = role === 'seller' || Boolean(listings.find((l) => l.id === listingId)?.mine)
  const ownRequest = role === 'buyer' || Boolean(openRequests.find((r) => r.id === requestId)?.mine)
  return ownListing && ownRequest
}

let proposals: MockProposal[] = [
  // Something to accept in the demo, on each side.
  {
    id: 'p-seed-1',
    forRole: 'buyer',
    initiatedBy: 'seller',
    status: 'pending',
    createdAt: minutesAgo(40),
    listing: listingInfo('buyer', 'l3')!,
    request: requestInfo('buyer', 'r1')!,
    negotiationId: null,
    closedReason: null,
  },
  {
    id: 'p-seed-2',
    forRole: 'seller',
    initiatedBy: 'buyer',
    status: 'pending',
    createdAt: minutesAgo(25),
    listing: listingInfo('seller', 'l6')!,
    request: requestInfo('seller', 'q1')!,
    negotiationId: null,
    closedReason: null,
  },
]

const publicProposal = ({ forRole, initiatedBy, ...rest }: MockProposal): Proposal => ({
  ...rest,
  direction: initiatedBy === forRole ? 'outgoing' : 'incoming',
})

const patchProposal = (id: string, patch: Partial<MockProposal>) => {
  proposals = proposals.map((p) => (p.id === id ? { ...p, ...patch } : p))
}

/**
 * A proposal was accepted: the negotiation starts, its listing and its request are locked, and every
 * other pending proposal for either of them is closed at once, so nobody can end up with two deals
 * or answer something that is no longer possible. The real back end does the same in one transaction.
 */
function acceptProposalNow(role: Role, p: MockProposal) {
  // The negotiation is about this proposal's service, with its other side. Chats start fresh.
  const myRequest = role === 'buyer' ? buyerRequests.find((r) => r.id === p.request.id) : undefined
  const myListing = role === 'seller' ? sellerListings.find((l) => l.id === p.listing.id) : undefined
  acceptedDeal[role] = {
    service: p.listing.title,
    counterpartName: role === 'buyer' ? p.listing.sellerName : p.request.buyerName,
    listPrice: p.listing.listPrice,
    ...(myRequest && { buyerLimits: { target: myRequest.target, max: myRequest.max } }),
    ...(myListing && { floor: myListing.priceFloor }),
  }
  chats.delete(negotiationFor(role))
  lockedListings.add(lockKey(role, p.listing.id))
  lockedRequests.add(lockKey(role, p.request.id))
  proposals = proposals.map((x) => {
    if (x.id === p.id) return { ...x, status: 'accepted', negotiationId: negotiationFor(role) }
    const sameThing = x.listing.id === p.listing.id || x.request.id === p.request.id
    return x.forRole === role && x.status === 'pending' && sameThing ? { ...x, status: 'declined', closedReason: 'taken' } : x
  })
}

function filterRequests(items: OpenRequest[], q: RequestQuery): OpenRequest[] {
  const scored = items
    .filter((r) => !q.category || r.category === q.category)
    .map((r) => ({
      r,
      score: relevance(q.keyword, [
        { text: r.title, weight: 5 },
        { text: r.category, weight: 3 },
        { text: r.deliverables, weight: 2 },
        { text: r.buyerName, weight: 1 },
      ]),
    }))
    .filter((x): x is { r: OpenRequest; score: number } => x.score !== null)
  if (q.sort === 'deadline') scored.sort((a, b) => a.r.deadline.localeCompare(b.r.deadline))
  else scored.sort((a, b) => b.score - a.score)
  return scored.map((x) => x.r)
}

const notFound = () => new ApiError(404, 'NOT_FOUND', 'We could not find that negotiation.')

// The service and the other person of each demo negotiation. The live one ("demo") is whatever
// proposal was accepted last on that side; until then it is the default scenario.
const acceptedDeal: Partial<Record<Role, DealInfo>> = {}
const N1_DEAL: DealInfo = { service: '5-page business website', counterpartName: 'Maya Santos', listPrice: 500 }

function dealOf(id: string): DealInfo {
  if (id === 'n1') return N1_DEAL
  if (id === DEMO_ENDED_ID) return ENDED_BUYER_DEAL
  if (id === DEMO_SELLER_NEGOTIATION_ID) return acceptedDeal.seller ?? DEFAULT_SELLER_DEAL
  return acceptedDeal.buyer ?? DEFAULT_BUYER_DEAL
}

const isKnownNegotiation = (id: string) =>
  id === DEMO_NEGOTIATION_ID ||
  id === DEMO_SELLER_NEGOTIATION_ID ||
  id === DEMO_ENDED_ID ||
  id === DEMO_AGREED_ID ||
  id === DEMO_SELLER_ENDED_ID ||
  id === 'n1'

// Both humans' decisions on the agreed demo deal. One shared object, as on the real back end.
let approval: { buyer: Decision; seller: Decision } = { buyer: 'pending', seller: 'pending' }

function currentApproval(id: string): DealApproval {
  return {
    negotiationId: id,
    agreedPrice: 380,
    buyer: approval.buyer,
    seller: approval.seller,
    status: approvalStatus(approval.buyer, approval.seller),
  }
}

/** Only an agreed negotiation has an approval (same rule as the real back end). */
function requireAgreed(id: string) {
  if (!isKnownNegotiation(id)) throw notFound()
  if (id !== DEMO_AGREED_ID) throw new ApiError(400, 'VALIDATION', 'This negotiation has not reached an agreement.')
}

async function decide(id: string, decision: 'approved' | 'declined'): Promise<DealApproval> {
  await delay()
  requireAgreed(id)
  const mine = demoRole
  const other: Role = mine === 'buyer' ? 'seller' : 'buyer'
  if (approvalStatus(approval.buyer, approval.seller) === 'declined') {
    throw new ApiError(400, 'VALIDATION', 'This deal was already declined, so nothing can be approved.')
  }
  if (approval[mine] !== 'pending') throw new ApiError(400, 'VALIDATION', 'You already answered this deal.')
  approval = { ...approval, [mine]: decision }
  // The demo counterpart approves a few seconds later, so a presentation can show the whole flow.
  if (decision === 'approved') {
    setTimeout(() => {
      if (approval[other] === 'pending') approval = { ...approval, [other]: 'approved' }
    }, SIM_ACCEPT_MS)
  }
  return currentApproval(id)
}

// The buyer's payment for the agreed demo deal (the real back end keeps this next to the PayPal order).
let payment: Pick<Payment, 'status' | 'orderId' | 'captureId' | 'paidAt'> = {
  status: 'unpaid',
  orderId: null,
  captureId: null,
  paidAt: null,
}
let openOrderId: string | null = null

function currentPayment(id: string): Payment {
  return { negotiationId: id, amount: 380, ...payment }
}

/** Same checks as the real back end: buyer only, and only after both sides approved. */
function requirePayable(id: string) {
  requireAgreed(id)
  if (demoRole !== 'buyer') throw new ApiError(403, 'FORBIDDEN', 'Only the buyer can pay.')
  if (approvalStatus(approval.buyer, approval.seller) !== 'approved') {
    throw new ApiError(400, 'VALIDATION', 'Both sides must approve the agreed price first.')
  }
  if (payment.status === 'paid') throw new ApiError(400, 'VALIDATION', 'This deal is already paid.')
}

const notYours = () => new ApiError(403, 'FORBIDDEN', 'This is not your negotiation.')

export const mockApi: Api = {
  async getMe() {
    await delay(100)
    // The demo person can both buy and sell, so the "Viewing as" switch is shown.
    return { id: 'demo-user', name: 'Alex Morgan', roles: ['buyer', 'seller'] }
  },

  async searchListings(q) {
    await delay()
    // A seller who went into a negotiation by accepting a proposal shows as locked here too.
    return filterListings(
      listings.map((l) => ({ ...l, locked: l.locked || lockedListings.has(lockKey('buyer', l.id)) })),
      q,
    )
  },

  async searchRequests(q) {
    await delay()
    if (demoRole !== 'seller') throw new ApiError(403, 'FORBIDDEN', 'Only sellers can search buyer requests.')
    return filterRequests(
      openRequests.map((r) => ({ ...r, locked: r.locked || isRequestLocked('seller', r.id) })),
      q,
    )
  },

  async sendProposal({ role, listingId, requestId }) {
    await delay()
    const listing = listingInfo(role, listingId)
    const request = requestInfo(role, requestId)
    if (!listing) throw new ApiError(404, 'NOT_FOUND', 'We could not find that listing.')
    if (!request) throw new ApiError(404, 'NOT_FOUND', 'We could not find that request.')
    if (isSelfDeal(role, listingId, requestId)) {
      throw new ApiError(400, 'VALIDATION', "You can't negotiate with yourself. Pick a listing or a request that isn't yours.")
    }
    if (isLocked(role, listingId)) {
      throw new ApiError(
        409,
        'SELLER_LOCKED',
        role === 'buyer'
          ? 'This seller is already negotiating with another buyer.'
          : 'This listing is already in a negotiation.',
      )
    }
    if (isRequestLocked(role, requestId)) {
      throw new ApiError(
        409,
        'REQUEST_LOCKED',
        role === 'buyer'
          ? 'This request is already in a negotiation. Send a new proposal when it ends.'
          : 'This buyer already started a negotiation for this request.',
      )
    }
    const samePair = proposals.find(
      (p) => p.forRole === role && p.status === 'pending' && p.listing.id === listingId && p.request.id === requestId,
    )
    if (samePair) {
      throw new ApiError(
        400,
        'VALIDATION',
        samePair.initiatedBy === role
          ? 'You already sent this proposal. Wait for an answer.'
          : 'They already sent you a proposal for this. Open Proposals to accept it.',
      )
    }

    const id = nextId('p')
    proposals = [
      {
        id,
        forRole: role,
        initiatedBy: role,
        status: 'pending',
        createdAt: new Date().toISOString(),
        listing,
        request,
        negotiationId: null,
        closedReason: null,
      },
      ...proposals,
    ]
    // The demo counterpart accepts after a few seconds, so a presentation can show the whole flow.
    setTimeout(() => {
      const sent = proposals.find((p) => p.id === id)
      if (sent?.status === 'pending') acceptProposalNow(role, sent)
    }, SIM_ACCEPT_MS)
    return { id }
  },

  async listProposals(role) {
    await delay()
    return proposals
      .filter((p) => p.forRole === role)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(publicProposal)
  },

  async countIncomingProposals(role) {
    await delay(80)
    return proposals.filter((p) => p.forRole === role && p.initiatedBy !== role && p.status === 'pending').length
  },

  async acceptProposal(id) {
    await delay()
    const p = proposals.find((x) => x.id === id && x.forRole === demoRole)
    if (!p) throw new ApiError(404, 'NOT_FOUND', 'We could not find that proposal.')
    if (p.initiatedBy === demoRole) throw new ApiError(403, 'FORBIDDEN', 'You sent this proposal, so the other side answers it.')
    if (p.status !== 'pending') throw new ApiError(400, 'VALIDATION', 'This proposal was already answered.')
    if (isSelfDeal(demoRole, p.listing.id, p.request.id)) {
      throw new ApiError(400, 'VALIDATION', "You can't negotiate with yourself.")
    }
    if (isLocked(demoRole, p.listing.id)) {
      throw new ApiError(409, 'SELLER_LOCKED', 'The listing is now in another negotiation, so this proposal cannot be accepted.')
    }
    if (isRequestLocked(demoRole, p.request.id)) {
      throw new ApiError(409, 'REQUEST_LOCKED', 'The request is now in another negotiation, so this proposal cannot be accepted.')
    }
    acceptProposalNow(demoRole, p)
    return publicProposal(proposals.find((x) => x.id === id)!)
  },

  async declineProposal(id) {
    await delay()
    const p = proposals.find((x) => x.id === id && x.forRole === demoRole)
    if (!p) throw new ApiError(404, 'NOT_FOUND', 'We could not find that proposal.')
    if (p.initiatedBy === demoRole) throw new ApiError(403, 'FORBIDDEN', 'You sent this proposal, so the other side answers it.')
    if (p.status !== 'pending') throw new ApiError(400, 'VALIDATION', 'This proposal was already answered.')
    patchProposal(id, { status: 'declined' })
    return publicProposal(proposals.find((x) => x.id === id)!)
  },

  async withdrawProposal(id) {
    await delay()
    const p = proposals.find((x) => x.id === id && x.forRole === demoRole)
    if (!p) throw new ApiError(404, 'NOT_FOUND', 'We could not find that proposal.')
    if (p.initiatedBy !== demoRole) throw new ApiError(403, 'FORBIDDEN', 'Only the side that sent a proposal can withdraw it.')
    if (p.status !== 'pending') throw new ApiError(400, 'VALIDATION', 'This proposal was already answered.')
    patchProposal(id, { status: 'withdrawn' })
    return publicProposal(proposals.find((x) => x.id === id)!)
  },

  async getNegotiation(id) {
    await delay(150)
    if (!isKnownNegotiation(id)) throw notFound()
    // The real back end picks the view from who is signed in. The demo picks it from the header switch.
    if (id === DEMO_AGREED_ID) return demoAgreedNegotiation(id, demoRole)
    if (id === DEMO_SELLER_ENDED_ID) {
      if (demoRole !== 'seller') throw notYours()
      return demoSellerEndedNegotiation(id)
    }
    if (id === DEMO_SELLER_NEGOTIATION_ID) {
      if (demoRole !== 'seller') throw notYours()
      return demoSellerNegotiation(id, dealOf(id))
    }
    if (demoRole !== 'buyer') throw notYours()
    return id === DEMO_ENDED_ID ? demoEndedNegotiation(id, dealOf(id)) : demoNegotiation(id, dealOf(id))
  },

  async getMessages(id, afterId) {
    await delay(100)
    if (!isKnownNegotiation(id)) throw notFound()
    const messages = chatOf(id)
    if (!afterId) return [...messages]
    const index = messages.findIndex((m) => m.id === afterId)
    return index === -1 ? [...messages] : messages.slice(index + 1)
  },

  async sendMessage(id, text) {
    await delay(150)
    if (!isKnownNegotiation(id)) throw notFound()
    const clean = text.trim()
    if (!clean) throw new ApiError(400, 'VALIDATION', 'Write a message first.')
    if (clean.length > 500) throw new ApiError(400, 'VALIDATION', 'Messages can be at most 500 characters.')
    const created: ChatMessage[] = [{ id: nextId('u'), from: demoRole, sentAt: new Date().toISOString(), text: clean }]
    if (PRICE_PATTERN.test(clean)) {
      created.push({ id: nextId('w'), from: 'system', tone: 'warning', text: PRICE_WARNING })
    }
    chats.set(id, [...chatOf(id), ...created])
    return created
  },

  async getApproval(id) {
    await delay(150)
    requireAgreed(id)
    return currentApproval(id)
  },

  approveDeal: (id) => decide(id, 'approved'),
  declineDeal: (id) => decide(id, 'declined'),

  async getPayment(id) {
    await delay(150)
    requireAgreed(id)
    return currentPayment(id)
  },

  async createPaymentOrder(id) {
    await delay(400)
    requirePayable(id)
    openOrderId = `DEMO-ORDER-${Date.now().toString(36).toUpperCase()}`
    return { orderId: openOrderId }
  },

  async capturePayment(id, orderId) {
    await delay(900)
    requirePayable(id)
    if (!openOrderId || orderId !== openOrderId) throw new ApiError(400, 'VALIDATION', 'That PayPal order is not valid for this deal.')
    payment = { status: 'paid', orderId, captureId: `DEMO-CAPTURE-${Date.now().toString(36).toUpperCase()}`, paidAt: new Date().toISOString() }
    openOrderId = null
    return currentPayment(id)
  },

  async getOutcome(id) {
    await delay()
    if (id === 'n1') throw new ApiError(409, 'VALIDATION', 'This negotiation has not ended yet.')
    if (id !== DEMO_ENDED_ID && id !== DEMO_NEGOTIATION_ID) throw notFound()
    return demoEndedSession(id, dealOf(id))
  },

  async listBuyerRequests() {
    await delay()
    return buyerRequests.map((r) => ({ ...r, locked: isRequestLocked('buyer', r.id) }))
  },

  async createBuyerRequest(input) {
    await delay()
    if (input.max < input.target) throw new ApiError(400, 'VALIDATION', 'The maximum must be at least the target.')
    const created: BuyerRequest = { id: nextId('r'), ...input, locked: false }
    buyerRequests = [created, ...buyerRequests]
    return created
  },

  async listBuyerNegotiations() {
    await delay()
    return [...buyerNegotiations]
  },

  async listSellerListings() {
    await delay()
    return [...sellerListings]
  },

  async createSellerListing(input) {
    await delay()
    if (input.priceFloor > input.listPrice) {
      throw new ApiError(400, 'VALIDATION', 'The price floor cannot be above the list price.')
    }
    const created: SellerListing = { id: nextId('l'), ...input }
    sellerListings = [created, ...sellerListings]
    return created
  },

  async updateSellerListing(id, input) {
    await delay()
    if (sellerActiveNegotiation?.listingId === id) {
      throw new ApiError(409, 'SELLER_LOCKED', 'This listing is in an active negotiation, so it cannot be edited.')
    }
    if (input.priceFloor > input.listPrice) {
      throw new ApiError(400, 'VALIDATION', 'The price floor cannot be above the list price.')
    }
    const existing = sellerListings.find((l) => l.id === id)
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'We could not find that listing.')
    const updated: SellerListing = { id, ...input }
    sellerListings = sellerListings.map((l) => (l.id === id ? updated : l))
    return updated
  },

  async listSellerNegotiations() {
    await delay()
    // The settled one follows the shared approval state, so approving on the Payment screen shows up here.
    return sellerNegotiations.map((r) =>
      r.id === DEMO_AGREED_ID ? { ...r, deal: approvalStatus(approval.buyer, approval.seller) } : { ...r },
    )
  },

  async listSellerSales() {
    await delay()
    // The settled demo deal follows the shared approval and payment state, so paying on the Payment
    // screen turns it into a sale here. Everything else is earlier history.
    const approved = approvalStatus(approval.buyer, approval.seller)
    const outcome: SaleOutcome =
      payment.status === 'paid'
        ? 'paid'
        : approved === 'approved'
          ? 'awaiting_payment'
          : approved === 'declined'
            ? 'declined'
            : 'awaiting_approval'
    const live: SellerSale = {
      id: DEMO_AGREED_ID,
      date: payment.paidAt ?? new Date().toISOString(),
      service: '5-page business website',
      buyerName: 'Ben Carter',
      listPrice: 500,
      priceFloor: 320,
      agreedPrice: 380,
      rounds: 3,
      outcome,
    }
    return [live, ...sellerSales]
  },

  async getSellerActiveNegotiation() {
    await delay()
    return sellerActiveNegotiation
  },
}
