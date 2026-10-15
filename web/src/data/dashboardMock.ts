// Demo data for the dashboards. Part of the single demo scenario in ./mock.ts and
// used only through src/api/mock.ts. Screens never import this file.
import type {
  BuyerNegotiationRow,
  BuyerRequest,
  SellerActiveNegotiation,
  SellerListing,
  SellerNegotiationRow,
  SellerSale,
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

// The seller's earlier deals, newest first (the live demo deal is added on top by src/api/mock.ts).
// Prices stay between each listing's floor and list price, as the engine guarantees.
const sale = (
  id: string,
  date: string,
  service: string,
  buyerName: string,
  listPrice: number,
  priceFloor: number,
  agreedPrice: number | null,
  rounds: number,
  outcome: SellerSale['outcome'],
): SellerSale => ({ id, date: `${date}T10:00:00Z`, service, buyerName, listPrice, priceFloor, agreedPrice, rounds, outcome })

export const sellerSales: SellerSale[] = [
  sale('h14', '2026-10-10', 'Simple blog setup', 'Isabel Cruz', 150, 100, null, 3, 'no_agreement'),
  sale('h13', '2026-09-30', 'SEO audit', 'Owen Murphy', 220, 150, 170, 2, 'awaiting_payment'),
  sale('h12', '2026-09-15', 'Logo and brand kit', 'Mei Lin', 260, 180, 225, 2, 'paid'),
  sale('h11', '2026-08-29', '5-page business website', 'Ethan Brooks', 500, 320, 410, 3, 'paid'),
  sale('h10', '2026-08-11', 'Shopify product pages', 'Layla Hassan', 400, 280, 350, 3, 'declined'),
  sale('h09', '2026-07-25', 'Landing page design', 'Noah Fischer', 320, 220, 300, 1, 'paid'),
  sale('h08', '2026-07-02', 'Simple blog setup', 'Sofia Alvarez', 150, 100, null, 3, 'no_agreement'),
  sale('h07', '2026-06-17', '5-page business website', 'Hannah Cole', 500, 320, 455, 2, 'paid'),
  sale('h06', '2026-05-30', 'SEO audit', 'Diego Ramos', 220, 150, 180, 3, 'paid'),
  sale('h05', '2026-05-14', 'Logo and brand kit', 'Elena Petrova', 260, 180, 235, 1, 'paid'),
  sale('h04', '2026-04-28', '5-page business website', 'Marcus Webb', 500, 320, null, 3, 'no_agreement'),
  sale('h03', '2026-04-09', 'Landing page design', 'Aiko Tanaka', 320, 220, 290, 2, 'paid'),
  sale('h02', '2026-03-21', 'Simple blog setup', 'Tom Becker', 150, 100, 130, 2, 'paid'),
  sale('h01', '2026-03-06', '5-page business website', 'Priya Nair', 500, 320, 430, 3, 'paid'),
]
