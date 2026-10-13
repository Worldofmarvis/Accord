import { request } from './http'
import type { Api } from './types'
import type { Negotiation } from '../types/marketplace'

const enc = encodeURIComponent

// The real back end. Endpoints are described in docs/API.md.
export const realApi: Api = {
  searchListings: (q) =>
    request('/listings', {
      query: { keyword: q.keyword, category: q.category, maxPrice: q.maxPrice, sort: q.sort },
    }),

  startNegotiation: (input) => request('/negotiations', { method: 'POST', body: input }),

  async getNegotiation(id) {
    const n = await request<Negotiation>(`/negotiations/${enc(id)}`)
    // Be forgiving about fields the back end may leave out.
    return { ...n, agreedPrice: n.agreedPrice ?? null, offers: n.offers ?? [] }
  },

  getMessages: (id, afterId) => request(`/negotiations/${enc(id)}/messages`, { query: { after: afterId } }),

  async sendMessage(id, text) {
    const res = await request<unknown>(`/negotiations/${enc(id)}/messages`, { method: 'POST', body: { text } })
    return (Array.isArray(res) ? res : [res]) as Awaited<ReturnType<Api['sendMessage']>>
  },

  getOutcome: (id) => request(`/negotiations/${enc(id)}/outcome`),

  listBuyerRequests: () => request('/buyer/requests'),
  createBuyerRequest: (input) => request('/buyer/requests', { method: 'POST', body: input }),
  listBuyerNegotiations: () => request('/buyer/negotiations'),

  listSellerListings: () => request('/seller/listings'),
  createSellerListing: (input) => request('/seller/listings', { method: 'POST', body: input }),
  updateSellerListing: (id, input) => request(`/seller/listings/${enc(id)}`, { method: 'PUT', body: input }),
  getSellerActiveNegotiation: () => request('/seller/active-negotiation'),
}
