import { request } from './http'
import type { Api } from './types'
import type { Listing, Negotiation } from '../types/marketplace'
import type { Role } from '../types/me'

const enc = encodeURIComponent

// ---- The back end today (backend/openapi.yaml v0.2) ----
// It has /me, /users/demo and /listings/search. Its shapes differ a little from docs/API.md, so they are
// translated here and nowhere else. When the back end moves to docs/API.md, delete this block and the
// two functions that use it (getMe, searchListings).
type BackendUser = { id: number | string; name: string; role: Role }
type BackendListing = {
  id: number | string
  title: string
  sellerName?: string
  description?: string
  category?: string
  listPrice: number
  deliveryDays?: number
  locked?: boolean
}

const BACKEND_SORT = { match: 'best_match', price: 'price_asc', delivery: 'best_match' } as const

function toListing(l: BackendListing): Listing {
  return {
    id: String(l.id),
    title: l.title,
    sellerName: l.sellerName ?? 'Seller',
    description: l.description ?? '',
    categories: l.category ? [l.category] : [],
    tags: [],
    listPrice: Number(l.listPrice),
    deliveryDays: Number(l.deliveryDays ?? 0),
    locked: Boolean(l.locked),
  }
}

// The real back end. Endpoints are described in docs/API.md.
export const realApi: Api = {
  async getMe() {
    const u = await request<BackendUser>('/me')
    return { id: String(u.id), name: u.name, roles: [u.role] }
  },

  async searchListings(q) {
    const data = await request<{ results: BackendListing[] } | BackendListing[]>('/listings/search', {
      query: { keyword: q.keyword, category: q.category, maxPrice: q.maxPrice, sort: BACKEND_SORT[q.sort] },
    })
    const listings = (Array.isArray(data) ? data : data.results).map(toListing)
    // The back end has no delivery sort yet.
    if (q.sort === 'delivery') listings.sort((a, b) => a.deliveryDays - b.deliveryDays)
    return listings
  },

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
