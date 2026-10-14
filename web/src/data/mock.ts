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

export function demoNegotiation(id: string): Negotiation {
  return {
    id,
    status: 'active',
    viewerRole: 'buyer',
    service: '5-page business website',
    counterpartName: 'Maya Santos',
    listPrice: 500,
    round: 2,
    maxRounds: 3,
    buyerLimits: { target: 350, max: 400 },
    agreedPrice: null,
    waitingOn: 'seller',
    offers: [
      { round: 1, role: 'buyer', amount: 340, note: 'Opening below the target to leave room to move.' },
      {
        round: 1,
        role: 'seller',
        amount: 500,
        note: 'Starting at the list price. Open to adjusting the price if the scope changes.',
        blocked: { proposed: 520, reason: 'above the listed price of $500' },
      },
      {
        round: 2,
        role: 'buyer',
        amount: 360,
        note: 'A small step up with the same scope: 5 pages, contact form, blog.',
      },
    ],
  }
}

/**
 * The same negotiation as the seller sees it: their own floor, no buyer limits, and the buyer
 * agent's notes without any hint of the buyer's budget.
 */
export function demoSellerNegotiation(id: string): Negotiation {
  return {
    id,
    status: 'active',
    viewerRole: 'seller',
    service: '5-page business website',
    counterpartName: 'Jordan Lee',
    listPrice: 500,
    round: 2,
    maxRounds: 3,
    sellerLimits: { floor: 320 },
    agreedPrice: null,
    waitingOn: 'seller',
    offers: [
      { round: 1, role: 'buyer', amount: 340, note: 'Opening offer.' },
      {
        round: 1,
        role: 'seller',
        amount: 500,
        note: 'Starting at the list price. Open to adjusting the price if the scope changes.',
        blocked: { proposed: 520, reason: 'above the listed price of $500' },
      },
      { round: 2, role: 'buyer', amount: 360, note: 'A small step up with the same scope: 5 pages, contact form, blog.' },
    ],
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
export function demoEndedNegotiation(id: string): Negotiation {
  return {
    id,
    status: 'no_agreement',
    viewerRole: 'buyer',
    service: '5-page business website',
    counterpartName: 'Maya Santos',
    listPrice: 500,
    round: 3,
    maxRounds: 3,
    buyerLimits: { target: 350, max: 400 },
    agreedPrice: null,
    waitingOn: null,
    offers: [
      { round: 1, role: 'buyer', amount: 240, note: 'Opening low.' },
      { round: 1, role: 'seller', amount: 500, note: 'Starting at the list price.' },
      { round: 2, role: 'buyer', amount: 270, note: 'A small step up.' },
      { round: 2, role: 'seller', amount: 460, note: 'A small concession.' },
      { round: 3, role: 'buyer', amount: 300, note: 'Final offer.' },
      { round: 3, role: 'seller', amount: 420, note: 'Final offer.' },
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

export const demoMessages: ChatMessage[] = [
  { id: 'm1', from: 'seller', sentAt: minutesAgo(25), text: 'Hi! Does the 5-page site include a contact form?' },
  { id: 'm2', from: 'buyer', sentAt: minutesAgo(23), text: 'Yes, plus a simple blog page. I need it by Oct 30.' },
  { id: 'm3', from: 'seller', sentAt: minutesAgo(22), text: 'Great. I can fit both if the scope stays at 5 pages.' },
  { id: 'm4', from: 'system', tone: 'note', text: 'Scope noted: 5 pages, contact form, blog' },
  { id: 'm5', from: 'buyer', sentAt: minutesAgo(20), text: 'Can we just agree on $300 here?' },
  {
    id: 'm6',
    from: 'system',
    tone: 'warning',
    text: "Prices can't be changed in chat. Your agent makes offers through the negotiation.",
  },
]

export function demoEndedSession(id: string): EndedSession {
  return {
    id,
    service: '5-page business website',
    sellerName: 'Maya Santos',
    rounds: [
      { round: 1, buyer: 240, seller: 500 },
      { round: 2, buyer: 270, seller: 460 },
      { round: 3, buyer: 300, seller: 420 },
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
    ],
  }
}
