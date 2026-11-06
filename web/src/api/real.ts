import { request } from './http'
import { ApiError } from './errors'
import { getUserId, setUserId } from './session'
import type { Api } from './types'
import type { BuyerRequest } from '../types/dashboard'
import type { Listing, Negotiation } from '../types/marketplace'

const enc = encodeURIComponent

type Ret<K extends keyof Api> = Awaited<ReturnType<Api[K]>>

// What GET /negotiations/:id sends today: sellerName for both sides, a floor called priceFloor, and "paid".
type RawNegotiation = Negotiation & {
  sellerName?: string
  paid?: boolean
  sellerLimits?: { floor?: number; priceFloor?: number }
}

const unsupported = (what: string) => new ApiError(501, 'UNKNOWN', `${what} isn't available in this version.`)

const fetchRaw = (id: string) => request<RawNegotiation>(`/negotiations/${enc(id)}`)




function paymentOf(id: string, n: RawNegotiation, orderId: string | null, paidAt: string | null): Ret<'getPayment'> {
  return {
    negotiationId: id,
    status: n.paid ? 'paid' : 'unpaid',
    amount: n.agreedPrice ?? 0,
    orderId,
    captureId: null,
    paidAt,
  } as Ret<'getPayment'>
}

// The real back end, adapted to what backend/routes actually offer today.
// Anything the back end does not have yet is stubbed here (see the notes in docs/API.md).
export const realApi: Api = {
  // The back end has /users/demo. Pick the stored user (or the first one) and turn it into the contract's Me.
  async getMe() {
    const users = await request<{ id: string; name: string; role: string }[]>('/users/demo')
    const stored = getUserId()
    const u = users.find((x) => String(x.id) === stored) ?? users[0]
    if (!u) throw new ApiError(401, 'UNAUTHENTICATED', 'No demo users found.')
    setUserId(String(u.id))
    return { id: String(u.id), name: u.name, roles: [u.role as 'buyer' | 'seller'] } as Ret<'getMe'>
  },

  async searchListings(q) {
    const items = await request<Listing[]>('/listings', {
      query: { keyword: q.keyword, category: q.category, maxPrice: q.maxPrice, sort: q.sort },
    })
    return items.map((l) => ({ ...l, mine: l.mine ?? false }))
  },

  // No back end route yet: sellers see no open requests.
  async searchRequests() {
    return []
  },

  // No proposals on the back end. A buyer's "Negotiate" starts the negotiation directly.
  async sendProposal(input) {
    if (input.role !== 'buyer') throw unsupported('Starting a negotiation as a seller')
    const res = await request<{ id: string }>('/negotiations', {
      method: 'POST',
      body: { listingId: input.listingId, requestId: input.requestId },
    })
    // Go straight to the live negotiation, since there is no proposal to wait for.
    window.location.assign(`/negotiations/${enc(res.id)}`)
    return res as Ret<'sendProposal'>
  },
  async listProposals() {
    return []
  },
  async countIncomingProposals() {
    return 0
  },
  async acceptProposal() {
    throw unsupported('Proposals')
  },
  async declineProposal() {
    throw unsupported('Proposals')
  },
  async withdrawProposal() {
    throw unsupported('Proposals')
  },

  async getNegotiation(id) {
    const n = await fetchRaw(id)
    const isBuyer = Boolean(n.buyerLimits)
    const { sellerLimits, ...rest } = n
    return {
      ...rest,
      ...(sellerLimits ? { sellerLimits: { floor: sellerLimits.priceFloor ?? sellerLimits.floor ?? 0 } } : {}),
      viewerRole: isBuyer ? 'buyer' : 'seller',
      // The back end sends only the seller's name, so a seller sees no counterpart name.
      counterpartName: n.counterpartName ?? '',
      agreedPrice: n.agreedPrice ?? null,
      offers: n.offers ?? [],
    } as Negotiation
  },

  getMessages: (id, afterId) => request(`/negotiations/${enc(id)}/messages`, { query: { after: afterId } }),

  async sendMessage(id, text) {
    const res = await request<unknown>(`/negotiations/${enc(id)}/messages`, { method: 'POST', body: { text } })
    return (Array.isArray(res) ? res : [res]) as Ret<'sendMessage'>
  },

  //// Approval from the backend.
  getApproval: (id) => request(`/negotiations/${enc(id)}/approval`),
  approveDeal: (id) => request(`/negotiations/${enc(id)}/approval/approve`, { method: 'POST' }),
  declineDeal: (id) => request(`/negotiations/${enc(id)}/approval/decline`, { method: 'POST' }),
 

  // The payment state comes from the negotiation itself.
  async getPayment(id) {
    return paymentOf(id, await fetchRaw(id), null, null)
  },
  async createPaymentOrder(id) {
    const res = await request<{ orderId: string }>(`/negotiations/${enc(id)}/payment/order`, { method: 'POST' })
    return { orderId: res.orderId } as Ret<'createPaymentOrder'>
  },
  async capturePayment(id, orderId) {
    const n = await request<RawNegotiation>(`/negotiations/${enc(id)}/payment/capture`, { method: 'POST', body: { orderId } })
    return paymentOf(id, n, orderId, new Date().toISOString())
  },

  getOutcome: (id) => request(`/negotiations/${enc(id)}/outcome`),

  async listBuyerRequests() {
    const items = await request<BuyerRequest[]>('/buyer/requests')
    return items.map((r) => ({ ...r, locked: r.locked ?? false }))
  },
  async createBuyerRequest(input) {
    const created = await request<BuyerRequest>('/buyer/requests', { method: 'POST', body: input })
    return { ...created, locked: created.locked ?? false }
  },
  listBuyerNegotiations: () => request('/buyer/negotiations'),

  listSellerListings: () => request('/seller/listings'),
  createSellerListing: (input) => request('/seller/listings', { method: 'POST', body: input }),
  updateSellerListing: (id, input) => request(`/seller/listings/${enc(id)}`, { method: 'PUT', body: input }),
  getSellerActiveNegotiation: () => request('/seller/active-negotiation'),

  // No back end routes yet: empty history.
  async listSellerSales() {
    return []
  },
  async listSellerNegotiations() {
    return []
  },
}