import { request } from './http'
import type { Api } from './types'
import type { BuyerRequest, SellerNegotiationRow } from '../types/dashboard'
import type { Listing, Negotiation } from '../types/marketplace'
import type { OpenRequest, Proposal } from '../types/proposal'

const enc = encodeURIComponent

// The real back end. Endpoints are described in docs/API.md.
export const realApi: Api = {
  getMe: () => request('/me'),

  async searchListings(q) {
    const items = await request<Listing[]>('/listings', {
      query: { keyword: q.keyword, category: q.category, maxPrice: q.maxPrice, sort: q.sort },
    })
    // Be forgiving about fields the back end may leave out.
    return items.map((l) => ({ ...l, mine: l.mine ?? false }))
  },

  async searchRequests(q) {
    const items = await request<OpenRequest[]>('/requests', {
      query: { keyword: q.keyword, category: q.category, sort: q.sort },
    })
    return items.map((r) => ({ ...r, locked: r.locked ?? false, mine: r.mine ?? false }))
  },

  sendProposal: (input) => request('/proposals', { method: 'POST', body: input }),
  async listProposals(role) {
    const items = await request<Proposal[]>('/proposals', { query: { role } })
    return items.map((p) => ({ ...p, closedReason: p.closedReason ?? null }))
  },
  async countIncomingProposals(role) {
    const res = await request<{ count: number }>('/proposals/incoming-count', { query: { role } })
    return res.count
  },
  acceptProposal: (id) => request(`/proposals/${enc(id)}/accept`, { method: 'POST' }),
  declineProposal: (id) => request(`/proposals/${enc(id)}/decline`, { method: 'POST' }),
  withdrawProposal: (id) => request(`/proposals/${enc(id)}/withdraw`, { method: 'POST' }),

  async getNegotiation(id) {
    const n = await request<Negotiation>(`/negotiations/${enc(id)}`)
    // Be forgiving about fields the back end may leave out.
    return {
      ...n,
      viewerRole: n.viewerRole ?? 'buyer',
      counterpartName: n.counterpartName ?? '',
      agreedPrice: n.agreedPrice ?? null,
      offers: n.offers ?? [],
    }
  },

  getMessages: (id, afterId) => request(`/negotiations/${enc(id)}/messages`, { query: { after: afterId } }),

  async sendMessage(id, text) {
    const res = await request<unknown>(`/negotiations/${enc(id)}/messages`, { method: 'POST', body: { text } })
    return (Array.isArray(res) ? res : [res]) as Awaited<ReturnType<Api['sendMessage']>>
  },

  getApproval: (id) => request(`/negotiations/${enc(id)}/approval`),
  approveDeal: (id) => request(`/negotiations/${enc(id)}/approval/approve`, { method: 'POST' }),
  declineDeal: (id) => request(`/negotiations/${enc(id)}/approval/decline`, { method: 'POST' }),

  getPayment: (id) => request(`/negotiations/${enc(id)}/payment`),
  createPaymentOrder: (id) => request(`/negotiations/${enc(id)}/payment/order`, { method: 'POST' }),
  capturePayment: (id, orderId) => request(`/negotiations/${enc(id)}/payment/capture`, { method: 'POST', body: { orderId } }),

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
  async listSellerNegotiations() {
    const rows = await request<SellerNegotiationRow[]>('/seller/negotiations')
    // Be forgiving about fields the back end may leave out.
    return rows.map((r) => ({ ...r, agreedPrice: r.agreedPrice ?? null, deal: r.status === 'agreed' ? (r.deal ?? 'pending') : null }))
  },
}
