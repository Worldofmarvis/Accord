import { prisma } from './prisma.js'

// A seller with an active (or just-agreed, unpaid) negotiation is locked.
const LOCK_MS = Number(process.env.LOCK_MINUTES ?? 10) * 60 * 1000  // an agreed, unpaid deal holds the lock this long

const lockWhere = () => ({
  OR: [
    { status: { in: ['OPEN', 'IN_PROGRESS'] } },
    {
      status: 'AGREED',
      updatedAt: { gt: new Date(Date.now() - LOCK_MS) },
      payments: { none: { status: 'COMPLETED' } },
      NOT: { approval: { is: { OR: [{ buyer: 'declined' }, { seller: 'declined' }] } } },
    },
  ],
})

// The negotiation that locks this seller, or null.
export const lockOf = sellerId =>
  prisma.negotiation.findFirst({ where: { listing: { sellerId }, ...lockWhere() } })

// The ids of all sellers that are locked right now.
export async function lockedSellerIds() {
  const rows = await prisma.negotiation.findMany({
    where: lockWhere(),
    select: { listing: { select: { sellerId: true } } },
  })
  return new Set(rows.map(r => r.listing.sellerId))
}

// The ids of all requests that are in a negotiation right now.
export async function lockedRequestIds() {
  const rows = await prisma.negotiation.findMany({
    where: lockWhere(),
    select: { proposal: { select: { requestId: true } } },
  })
  return new Set(rows.map(r => r.proposal?.requestId).filter(Boolean))
}