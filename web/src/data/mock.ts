// The single demo scenario: a buyer negotiating a 5-page website with Maya Santos.
// It is used only when VITE_USE_MOCK is not "false" (see src/api/mock.ts), for
// presentations and for working before the back end exists. Screens never import this file.
import type { ChatMessage, EndedSession, Listing, Negotiation, Role } from '../types/marketplace'
import type { OpenRequest } from '../types/proposal'

/** The buyer's view of the live demo negotiation. */
export const DEMO_NEGOTIATION_ID = 'demo'

/** The seller's view of the same negotiation (the real API decides the view from who is signed in). */
export const DEMO_SELLER_NEGOTIATION_ID = 'demo-seller'

/** A negotiation id that the demo treats as already ended with no agreement. */
export const DEMO_ENDED_ID = 'n2'

/** A negotiation that ended with no agreement, as the seller sees it (the buyer's is `DEMO_ENDED_ID`). */
export const DEMO_SELLER_ENDED_ID = 'n3'

/** A negotiation the agents already settled. Both sides open the same id and each sees their own view. */
export const DEMO_AGREED_ID = 'agreed'

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()

export const listings: Listing[] = [
  {
    id: 'l1',
    title: '5-page business website',
    sellerName: 'Maya Santos',
    description: 'Responsive site with contact form, simple CMS setup and launch support.',
    categories: ['Web development'],
    tags: ['website'],
    listPrice: 500,
    deliveryDays: 7,
    locked: false,
    mine: false,
  },
  {
    id: 'l2',
    title: 'Portfolio website for creatives',
    sellerName: 'Daniel Reyes',
    description: 'Gallery layout, about page and contact form, built to be easy to update.',
    categories: ['Web development'],
    tags: ['website', 'portfolio'],
    listPrice: 450,
    deliveryDays: 10,
    locked: true,
    mine: false,
  },
  {
    id: 'l3',
    title: 'Landing page and brand setup',
    sellerName: 'Priya Nair',
    description: 'One high-converting landing page with logo files, colors and type choices.',
    categories: ['Web development', 'Design'],
    tags: ['website', 'landing page', 'logo', 'brand'],
    listPrice: 380,
    deliveryDays: 5,
    locked: false,
    mine: false,
  },
  {
    id: 'l4',
    title: 'WordPress site fix and redesign',
    sellerName: 'Lucas Moreau',
    description: 'Clean up an existing WordPress site: speed, layout fixes and a refreshed home page.',
    categories: ['Web development'],
    tags: ['website', 'wordpress'],
    listPrice: 320,
    deliveryDays: 4,
    locked: false,
    mine: false,
  },
  {
    // Also the first rematch suggestion on the "no agreement" screen, so it must exist here.
    id: 'l5',
    title: 'Small business website',
    sellerName: 'Amara Osei',
    description: 'A clean 5-page website for a small business, with a contact form and basic SEO.',
    categories: ['Web development'],
    tags: ['website', 'small business'],
    listPrice: 350,
    deliveryDays: 6,
    locked: false,
    mine: false,
  },
  {
    // The demo person's own listing (also on their seller dashboard), so the self-deal rule can be seen.
    id: 'l6',
    title: 'Simple blog setup',
    sellerName: 'Alex Morgan',
    description: 'Blog template, 3 starter posts and an editing guide.',
    categories: ['Writing'],
    tags: ['blog', 'writing'],
    listPrice: 150,
    deliveryDays: 5,
    locked: false,
    mine: true,
  },
]

/** What changes from one demo negotiation to the next. Everything else is derived from the list price. */
export type DealInfo = {
  service: string
  counterpartName: string
  listPrice: number
  /** The buyer's own limits, when known (from their request). */
  buyerLimits?: { target: number; max: number }
  /** The seller's own price floor, when known (from their listing). */
  floor?: number
}

export const DEFAULT_BUYER_DEAL: DealInfo = { service: '5-page business website', counterpartName: 'Maya Santos', listPrice: 500 }
export const DEFAULT_SELLER_DEAL: DealInfo = { service: '5-page business website', counterpartName: 'Jordan Lee', listPrice: 500, floor: 320 }
/** The buyer's ended negotiation from the dashboard (its final offers are $300 and $420). */
export const ENDED_BUYER_DEAL: DealInfo = { service: 'WordPress site fix and redesign', counterpartName: 'Lucas Moreau', listPrice: 500 }

const round5 = (v: number) => Math.round(v / 5) * 5

// The same shape of negotiation for any price: the buyer opens low, the seller starts at the list price.
const buyerLimitsOf = (d: DealInfo) => d.buyerLimits ?? { target: round5(d.listPrice * 0.7), max: round5(d.listPrice * 0.8) }
const floorOf = (d: DealInfo) => d.floor ?? round5(d.listPrice * 0.64)

function activeOffers(d: DealInfo, buyerNotes: [string, string]): Negotiation['offers'] {
  return [
    { round: 1, role: 'buyer', amount: round5(d.listPrice * 0.68), note: buyerNotes[0] },
    {
      round: 1,
      role: 'seller',
      amount: d.listPrice,
      note: 'Starting at the list price. Open to adjusting the price if the scope changes.',
      blocked: { proposed: round5(d.listPrice * 1.04), reason: `above the listed price of $${d.listPrice}` },
    },
    { round: 2, role: 'buyer', amount: round5(d.listPrice * 0.72), note: buyerNotes[1] },
  ]
}

export function demoNegotiation(id: string, deal: DealInfo = DEFAULT_BUYER_DEAL): Negotiation {
  return {
    id,
    status: 'active',
    viewerRole: 'buyer',
    service: deal.service,
    counterpartName: deal.counterpartName,
    listPrice: deal.listPrice,
    round: 2,
    maxRounds: 3,
    buyerLimits: buyerLimitsOf(deal),
    agreedPrice: null,
    waitingOn: 'seller',
    offers: activeOffers(deal, [
      'Opening below the target to leave room to move.',
      'A small step up with the same scope.',
    ]),
  }
}

/**
 * The same negotiation as the seller sees it: their own floor, no buyer limits, and the buyer
 * agent's notes without any hint of the buyer's budget.
 */
export function demoSellerNegotiation(id: string, deal: DealInfo = DEFAULT_SELLER_DEAL): Negotiation {
  return {
    id,
    status: 'active',
    viewerRole: 'seller',
    service: deal.service,
    counterpartName: deal.counterpartName,
    listPrice: deal.listPrice,
    round: 2,
    maxRounds: 3,
    sellerLimits: { floor: floorOf(deal) },
    agreedPrice: null,
    waitingOn: 'seller',
    offers: activeOffers(deal, ['Opening offer.', 'A small step up with the same scope.']),
  }
}

/** The settled demo deal as the buyer or the seller sees it. Still waiting for both humans to approve. */
export function demoAgreedNegotiation(id: string, role: Role): Negotiation {
  return {
    id,
    status: 'agreed',
    viewerRole: role,
    service: '5-page business website',
    counterpartName: role === 'buyer' ? 'Maya Santos' : 'Ben Carter',
    listPrice: 500,
    round: 3,
    maxRounds: 3,
    ...(role === 'buyer' ? { buyerLimits: { target: 350, max: 400 } } : { sellerLimits: { floor: 320 } }),
    agreedPrice: 380,
    waitingOn: null,
    offers: [
      { round: 1, role: 'buyer', amount: 340, note: 'Opening below the target to leave room to move.' },
      { round: 1, role: 'seller', amount: 500, note: 'Starting at the list price.' },
      { round: 2, role: 'buyer', amount: 360, note: 'A small step up with the same scope.' },
      { round: 2, role: 'seller', amount: 440, note: 'A small concession.' },
      { round: 3, role: 'buyer', amount: 380, note: 'Final offer within the budget.' },
      { round: 3, role: 'seller', amount: 380, note: 'Accepting the buyer’s final offer.' },
    ],
  }
}

/** What buyers need, as a seller sees it when searching. Public fields only: no budget (rule 5). */
export const openRequests: OpenRequest[] = [
  {
    id: 'q1',
    title: 'Blog posts for a bakery',
    buyerName: 'Sofia Alvarez',
    category: 'Writing',
    deliverables: '3 posts of 600 words, friendly tone',
    deadline: '2026-10-28',
    locked: false,
    mine: false,
  },
  {
    id: 'q2',
    title: 'Small shop website',
    buyerName: 'Ben Carter',
    category: 'Web development',
    deliverables: '4 pages, product list, contact form',
    deadline: '2026-11-05',
    locked: false,
    mine: false,
  },
  {
    id: 'q3',
    title: 'Logo and brand colors',
    buyerName: 'Nia Okafor',
    category: 'Design',
    deliverables: 'Logo files, 3 colors, 2 fonts',
    deadline: '2026-10-24',
    locked: false,
    mine: false,
  },
  {
    id: 'q4',
    title: 'Fix a slow WordPress site',
    buyerName: 'Omar Haddad',
    category: 'Web development',
    deliverables: 'Speed fixes and a refreshed home page',
    deadline: '2026-11-02',
    locked: false,
    mine: false,
  },
  {
    // The demo person's own request (also on their buyer dashboard), so the self-deal rule can be seen.
    id: 'q5',
    title: '5-page business website',
    buyerName: 'Alex Morgan',
    category: 'Web development',
    deliverables: '5 pages, contact form, blog',
    deadline: '2026-10-30',
    locked: false,
    mine: true,
  },
]

/** The ended negotiation, as the negotiation endpoint reports it. */
export function demoEndedNegotiation(id: string, deal: DealInfo = ENDED_BUYER_DEAL): Negotiation {
  const at = (ratio: number) => round5(deal.listPrice * ratio)
  return {
    id,
    status: 'no_agreement',
    viewerRole: 'buyer',
    service: deal.service,
    counterpartName: deal.counterpartName,
    listPrice: deal.listPrice,
    round: 3,
    maxRounds: 3,
    buyerLimits: buyerLimitsOf(deal),
    agreedPrice: null,
    waitingOn: null,
    offers: [
      { round: 1, role: 'buyer', amount: at(0.48), note: 'Opening low.' },
      { round: 1, role: 'seller', amount: at(1), note: 'Starting at the list price.' },
      { round: 2, role: 'buyer', amount: at(0.54), note: 'A small step up.' },
      { round: 2, role: 'seller', amount: at(0.92), note: 'A small concession.' },
      { round: 3, role: 'buyer', amount: at(0.6), note: 'Final offer.' },
      { round: 3, role: 'seller', amount: at(0.84), note: 'Final offer.' },
    ],
  }
}

/** The ended negotiation as the seller sees it: their own floor, no buyer limits. */
export function demoSellerEndedNegotiation(id: string): Negotiation {
  return {
    id,
    status: 'no_agreement',
    viewerRole: 'seller',
    service: 'Simple blog setup',
    counterpartName: 'Sofia Alvarez',
    listPrice: 150,
    round: 3,
    maxRounds: 3,
    sellerLimits: { floor: 100 },
    agreedPrice: null,
    waitingOn: null,
    offers: [
      { round: 1, role: 'buyer', amount: 80, note: 'Opening offer.' },
      { round: 1, role: 'seller', amount: 150, note: 'Starting at the list price.' },
      { round: 2, role: 'buyer', amount: 90, note: 'A small step up.' },
      { round: 2, role: 'seller', amount: 145, note: 'A small concession.' },
      { round: 3, role: 'buyer', amount: 95, note: 'Final offer.' },
      { round: 3, role: 'seller', amount: 140, note: 'Final offer.' },
    ],
  }
}

/** The chat history of one demo negotiation, about its own service. */
export function demoMessagesFor(service: string): ChatMessage[] {
  return [
    { id: 'm1', from: 'seller', sentAt: minutesAgo(25), text: `Hi! What exactly do you need for the ${service}?` },
    { id: 'm2', from: 'buyer', sentAt: minutesAgo(23), text: 'The scope is clear, and I need it done by the end of the month.' },
    { id: 'm3', from: 'seller', sentAt: minutesAgo(22), text: 'Great. I can fit that if the scope stays as described.' },
    { id: 'm4', from: 'system', tone: 'note', text: `Scope noted: ${service}` },
    { id: 'm5', from: 'buyer', sentAt: minutesAgo(20), text: 'Can we just agree on a lower price here?' },
    {
      id: 'm6',
      from: 'system',
      tone: 'warning',
      text: "Prices can't be changed in chat. Your agent makes offers through the negotiation.",
    },
  ]
}

export function demoEndedSession(id: string, deal: DealInfo = ENDED_BUYER_DEAL): EndedSession {
  const at = (ratio: number) => round5(deal.listPrice * ratio)
  return {
    id,
    service: deal.service,
    sellerName: deal.counterpartName,
    rounds: [
      { round: 1, buyer: at(0.48), seller: at(1) },
      { round: 2, buyer: at(0.54), seller: at(0.92) },
      { round: 3, buyer: at(0.6), seller: at(0.84) },
    ],
    rematches: [
      {
        listingId: 'l5',
        title: 'Small business website',
        sellerName: 'Amara Osei',
        listPrice: 350,
        reasons: ['Similar scope: 5-page website', 'Available now', 'Delivery fits your deadline'],
      },
      {
        listingId: 'l3',
        title: 'Landing page and brand setup',
        sellerName: 'Priya Nair',
        listPrice: 380,
        reasons: ['Web and design skills', 'Available now', 'Delivery in 5 days'],
      },
      {
        listingId: 'l4',
        title: 'WordPress site fix and redesign',
        sellerName: 'Lucas Moreau',
        listPrice: 320,
        reasons: ['Related scope: website redesign', 'Available now', 'Delivery in 4 days'],
      },
    ].filter((r) => r.title !== deal.service),
  }
}
