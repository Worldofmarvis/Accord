// Sample data from the Day 1 mockups. Replace these functions with API calls
// once the back end exists; the screens only depend on the types.
import type { EndedSession, Listing, Negotiation } from '../types/marketplace'

export const DEMO_NEGOTIATION_ID = 'demo'

export const listings: Listing[] = [
  {
    id: 'l1',
    title: '5-page business website',
    sellerName: 'Maya Santos',
    description: 'Responsive site with contact form, simple CMS setup and launch support.',
    categories: ['Web development'],
    listPrice: 500,
    deliveryDays: 7,
    locked: false,
  },
  {
    id: 'l2',
    title: 'Portfolio website for creatives',
    sellerName: 'Daniel Reyes',
    description: 'Gallery layout, about page and contact form, built to be easy to update.',
    categories: ['Web development'],
    listPrice: 450,
    deliveryDays: 10,
    locked: true,
  },
  {
    id: 'l3',
    title: 'Landing page and brand setup',
    sellerName: 'Priya Nair',
    description: 'One high-converting landing page with logo files, colors and type choices.',
    categories: ['Web development', 'Design'],
    listPrice: 380,
    deliveryDays: 5,
    locked: false,
  },
  {
    id: 'l4',
    title: 'WordPress site fix and redesign',
    sellerName: 'Lucas Moreau',
    description: 'Clean up an existing WordPress site: speed, layout fixes and a refreshed home page.',
    categories: ['Web development'],
    listPrice: 320,
    deliveryDays: 4,
    locked: false,
  },
]

export const categories = ['Web development', 'Design', 'Writing']

export function getNegotiation(id: string): Negotiation {
  return {
    id,
    service: '5-page business website',
    sellerName: 'Maya Santos',
    listPrice: 500,
    round: 2,
    maxRounds: 3,
    buyerLimits: { target: 350, max: 400 },
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
    messages: [
      { id: 'm1', from: 'seller', time: '10:42', text: 'Hi! Does the 5-page site include a contact form?' },
      { id: 'm2', from: 'buyer', time: '10:44', text: 'Yes, plus a simple blog page. I need it by Oct 30.' },
      { id: 'm3', from: 'seller', time: '10:45', text: 'Great. I can fit both if the scope stays at 5 pages.' },
      { id: 'm4', from: 'system', tone: 'note', text: 'Scope noted: 5 pages, contact form, blog' },
      { id: 'm5', from: 'buyer', time: '10:47', text: 'Can we just agree on $300 here?' },
      {
        id: 'm6',
        from: 'system',
        tone: 'warning',
        text: "Prices can't be changed in chat. Your agent makes offers through the negotiation.",
      },
    ],
  }
}

export function getEndedSession(id: string): EndedSession {
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
