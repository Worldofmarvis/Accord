// Built-in demo "server": answers every Api call from the single demo scenario in
// src/data, in memory. Used when VITE_USE_MOCK is not "false". Reloading the page resets it.
import { ApiError } from './errors'
import type { Api } from './types'
import {
  DEMO_ENDED_ID,
  DEMO_NEGOTIATION_ID,
  demoEndedNegotiation,
  demoEndedSession,
  demoMessages,
  demoNegotiation,
  listings,
} from '../data/mock'
import {
  buyerNegotiations,
  initialBuyerRequests,
  initialSellerListings,
  sellerActiveNegotiation,
} from '../data/dashboardMock'
import type { BuyerRequest, SellerListing } from '../types/dashboard'
import type { ChatMessage, Listing, SearchQuery } from '../types/marketplace'

const delay = (ms = 250) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// Looks like someone is trying to set a price in chat (rule 5: chat never changes the price).
const PRICE_PATTERN = /\$\s?\d|\b\d+\s?(usd|dollars)\b/i
const PRICE_WARNING = "Prices can't be changed in chat. Your agent makes offers through the negotiation."

// In-memory state, so things the user adds during a demo show up on the other screens.
let messages: ChatMessage[] = [...demoMessages]
let buyerRequests: BuyerRequest[] = [...initialBuyerRequests]
let sellerListings: SellerListing[] = [...initialSellerListings]
let counter = 0
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${++counter}`

function filterListings(items: Listing[], q: SearchQuery): Listing[] {
  const kw = q.keyword.trim().toLowerCase()
  const out = items.filter(
    (l) =>
      (!kw || `${l.title} ${l.description} ${l.sellerName} ${l.tags.join(' ')}`.toLowerCase().includes(kw)) &&
      (!q.category || l.categories.includes(q.category)) &&
      (q.maxPrice === null || l.listPrice <= q.maxPrice),
  )
  if (q.sort === 'price') out.sort((a, b) => a.listPrice - b.listPrice)
  if (q.sort === 'delivery') out.sort((a, b) => a.deliveryDays - b.deliveryDays)
  return out
}

const notFound = () => new ApiError(404, 'NOT_FOUND', 'We could not find that negotiation.')

const isKnownNegotiation = (id: string) => id === DEMO_NEGOTIATION_ID || id === DEMO_ENDED_ID || id === 'n1'

export const mockApi: Api = {
  async searchListings(q) {
    await delay()
    return filterListings(listings, q)
  },

  async startNegotiation({ listingId, requestId }) {
    await delay()
    if (!requestId) throw new ApiError(400, 'VALIDATION', 'Choose one of your requests first.')
    const listing = listings.find((l) => l.id === listingId)
    if (listing?.locked) {
      throw new ApiError(409, 'SELLER_LOCKED', 'This seller is already negotiating with another buyer.')
    }
    return { id: DEMO_NEGOTIATION_ID }
  },

  async getNegotiation(id) {
    await delay(150)
    if (!isKnownNegotiation(id)) throw notFound()
    return id === DEMO_ENDED_ID ? demoEndedNegotiation(id) : demoNegotiation(id)
  },

  async getMessages(id, afterId) {
    await delay(100)
    if (!isKnownNegotiation(id)) throw notFound()
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
    const created: ChatMessage[] = [{ id: nextId('u'), from: 'buyer', sentAt: new Date().toISOString(), text: clean }]
    if (PRICE_PATTERN.test(clean)) {
      created.push({ id: nextId('w'), from: 'system', tone: 'warning', text: PRICE_WARNING })
    }
    messages = [...messages, ...created]
    return created
  },

  async getOutcome(id) {
    await delay()
    if (id === 'n1') throw new ApiError(409, 'VALIDATION', 'This negotiation has not ended yet.')
    if (id !== DEMO_ENDED_ID && id !== DEMO_NEGOTIATION_ID) throw notFound()
    return demoEndedSession(id)
  },

  async listBuyerRequests() {
    await delay()
    return [...buyerRequests]
  },

  async createBuyerRequest(input) {
    await delay()
    if (input.max < input.target) throw new ApiError(400, 'VALIDATION', 'The maximum must be at least the target.')
    const created: BuyerRequest = { id: nextId('r'), ...input }
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

  async getSellerActiveNegotiation() {
    await delay()
    return sellerActiveNegotiation
  },
}
