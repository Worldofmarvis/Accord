// Demo data for the dashboards. Part of the single demo scenario in ./mock.ts and
// used only through src/api/mock.ts. Screens never import this file.
import type {
  BuyerNegotiationRow,
  BuyerRequest,
  SellerActiveNegotiation,
  SellerListing,
  SellerNegotiationRow,
} from '../types/dashboard'

export const initialBuyerRequests: BuyerRequest[] = [
  {
    id: 'r1',
    title: '5-page business website',
    category: 'Web development',
    deliverables: '5 pages, contact form, blog',
    deadline: '2026-10-30',
    target: 350,
    max: 400,
    locked: false,
  },
]

export const buyerNegotiations: BuyerNegotiationRow[] = [
  {
    id: 'n1',
    service: '5-page business website',
    sellerName: 'Maya Santos',
    status: 'active',
    round: 2,
    maxRounds: 3,
    buyerOffer: 360,
    sellerOffer: 500,
  },
  {
    id: 'n2',
    service: 'WordPress site fix and redesign',
    sellerName: 'Lucas Moreau',
    status: 'no_agreement',
    round: 3,
    maxRounds: 3,
    buyerOffer: 300,
    sellerOffer: 420,
  },
]

export const initialSellerListings: SellerListing[] = [
  {
    id: 'l1',
    title: '5-page business website',
    category: 'Web development',
    deliverables: 'Responsive site with contact form, simple CMS setup and launch support.',
    listPrice: 500,
    priceFloor: 320,
    deliveryDays: 7,
  },
  {
    id: 'l6',
    title: 'Simple blog setup',
    category: 'Writing',
    deliverables: 'Blog template, 3 starter posts and an editing guide.',
    listPrice: 150,
    priceFloor: 100,
    deliveryDays: 5,
  },
]

// The seller has one active negotiation (rule 3), so every listing is locked for other buyers.
export const sellerActiveNegotiation: SellerActiveNegotiation | null = {
  negotiationId: 'demo-seller',
  listingId: 'l1',
  round: 2,
  maxRounds: 3,
}

// The seller's history: the live one, a settled one waiting for approvals, and one that ended.
// The ids match the demo negotiations in ./mock.ts. The `deal` of the settled one is filled in
// from the shared approval state by src/api/mock.ts.
export const sellerNegotiations: SellerNegotiationRow[] = [
  {
    id: 'demo-seller',
    service: '5-page business website',
    buyerName: 'Jordan Lee',
    status: 'active',
    round: 2,
    maxRounds: 3,
    buyerOffer: 360,
    sellerOffer: 500,
    agreedPrice: null,
    deal: null,
  },
  {
    id: 'agreed',
    service: '5-page business website',
    buyerName: 'Ben Carter',
    status: 'agreed',
    round: 3,
    maxRounds: 3,
    buyerOffer: 380,
    sellerOffer: 380,
    agreedPrice: 380,
    deal: 'pending',
  },
  {
    id: 'n3',
    service: 'Simple blog setup',
    buyerName: 'Sofia Alvarez',
    status: 'no_agreement',
    round: 3,
    maxRounds: 3,
    buyerOffer: 95,
    sellerOffer: 140,
    agreedPrice: null,
    deal: null,
  },
]
