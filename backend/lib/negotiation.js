import { prisma } from './prisma.js'

// Database names <-> contract names
export const STATUS_IN = { OPEN: 'active', IN_PROGRESS: 'active', AGREED: 'agreed', FAILED: 'no_agreement', CANCELLED: 'no_agreement' }
export const STATUS_OUT = { active: 'IN_PROGRESS', agreed: 'AGREED', no_agreement: 'FAILED' }
const roleIn = by => (by === 'BUYER_AGENT' ? 'buyer' : 'seller')
const roleOut = role => (role === 'buyer' ? 'BUYER_AGENT' : 'SELLER_AGENT')

// Loads a negotiation from the database into the shape the engine expects.
export async function loadNeg(id) {
  const r = await prisma.negotiation.findUnique({
    where: { id },
    include: {
      listing: { include: { seller: true } },
      proposal: { include: { request: true } },
      offers: { orderBy: [{ roundNumber: 'asc' }, { offeredBy: 'asc' }] },   // buyer goes first in each round
      payments: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!r) return null

  const status = STATUS_IN[r.status]
  const offers = r.offers.map(o => ({
    round: o.roundNumber, role: roleIn(o.offeredBy), amount: o.proposedPrice, note: o.reasoning ?? '',
    ...(o.blockedPrice != null ? { blocked: { proposed: o.blockedPrice, reason: o.blockedReason ?? '' } } : {}),
  }))
  const last = offers.at(-1)
  const waitingOn = status !== 'active' ? null : !last ? 'buyer' : last.role === 'buyer' ? 'seller' : 'buyer'
  const req = r.proposal?.request

  return {
    id: r.id, listingId: r.listingId, sellerId: r.listing.sellerId, buyerId: r.buyerId,
    requestId: r.proposal?.requestId ?? null, category: r.listing.category,
    service: r.listing.title, sellerName: r.listing.seller.name, listPrice: r.listing.listPrice,
    status, round: r.currentRound, maxRounds: r.maxRounds, waitingOn,
    limits: {
      buyerTarget: r.buyerTargetPrice ?? req?.targetPrice ?? 0,
      buyerMax: r.buyerMaxPrice ?? req?.maxPrice ?? 0,
      sellerFloor: r.listing.floorPrice,
    },
    offers, audit: [],
    agreedPrice: r.finalPrice, paid: r.payments.some(p => p.status === 'COMPLETED'),
    orderId: r.payments[0]?.paypalOrderId ?? null,
    createdAt: r.createdAt.getTime(), closedAt: status === 'active' ? null : r.updatedAt.getTime(),
  }
}

const auditData = (negotiationId, type, payload) =>
  ({ negotiationId, eventType: String(type), payload: JSON.stringify(payload) })

export const logEvent = (negotiationId, type, payload = {}) =>
  prisma.auditEvent.create({ data: auditData(negotiationId, type, payload) })

// Saves what the engine just changed: new offers, round, status, final price and audit entries.
export async function saveNeg(n, knownOffers) {
  await prisma.$transaction([
    ...n.offers.slice(knownOffers).map(o => prisma.offer.create({
      data: {
        negotiationId: n.id, roundNumber: o.round, offeredBy: roleOut(o.role),
        proposedPrice: Math.round(o.amount), reasoning: o.note ?? null,
        blockedPrice: o.blocked ? Math.round(o.blocked.proposed) : null,
        blockedReason: o.blocked?.reason ?? null,
      },
    })),
    prisma.negotiation.update({
      where: { id: n.id },
      data: {
        currentRound: n.round, status: STATUS_OUT[n.status],
        finalPrice: n.agreedPrice != null ? Math.round(n.agreedPrice) : null,
      },
    }),
    ...n.audit.map(a => prisma.auditEvent.create({ data: auditData(n.id, a.type ?? a.event ?? 'EVENT', a) })),
  ])
}

// What each side is allowed to see. "blocked" details are only shown to the side that made the offer.
export function view(n, side) {
  const base = {
    id: n.id, status: n.status, service: n.service, sellerName: n.sellerName, listPrice: n.listPrice,
    round: n.round, maxRounds: n.maxRounds, waitingOn: n.waitingOn,
    offers: n.offers.map(o => { const { blocked, ...rest } = o; return o.role === side ? o : rest }),
    agreedPrice: n.agreedPrice, paid: n.paid,
  }
  return side === 'buyer'
    ? { ...base, buyerLimits: { target: n.limits.buyerTarget, max: n.limits.buyerMax } }
    : { ...base, sellerLimits: { priceFloor: n.limits.sellerFloor } }
}
