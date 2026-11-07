import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { MAX_ROUNDS } from '../engine.js'
import { fail, h } from '../lib/http.js'
import { currentUser } from '../lib/auth.js'
import { lockOf, requestLockOf } from '../lib/locks.js'
import { logEvent } from '../lib/negotiation.js'
import { scheduleStep } from '../lib/runner.js'

const router = Router()

class Http extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code }
}

// The signed-in user, or 401. No fallback user here.
const who = h(async (req, res, next) => {
  const user = await currentUser(req, async () => null)
  if (!user) return fail(res, 401, 'UNAUTHENTICATED', 'Not signed in')
  req.user = user
  next()
})

// Which side is the caller acting as? A person with both roles must say so (role).
function sideOf(req, res) {
  const roles = [...new Set((req.user.roles?.length ? req.user.roles : [req.user.role]).map(r => r.toLowerCase()))]

  const asked = String(req.body?.role ?? req.query.role ?? '').toLowerCase()
  if (asked) {
    if (!['buyer', 'seller'].includes(asked)) { fail(res, 400, 'VALIDATION', 'role must be buyer or seller'); return null }
    if (!roles.includes(asked)) { fail(res, 403, 'FORBIDDEN', `Your account is not a ${asked}`); return null }
    return asked
  }
  if (roles.length === 1) return roles[0]
  fail(res, 400, 'VALIDATION', 'role is required for an account with both roles')
  return null
}

const INCLUDE = { listing: { include: { seller: true } }, request: { include: { buyer: true } } }
const reload = id => prisma.proposal.findUnique({ where: { id }, include: INCLUDE })

// Built field by field: never floorPrice, targetPrice or maxPrice.
const toProposal = (p, side) => ({
  id: p.id,
  direction: p.sentBy.toLowerCase() === side ? 'outgoing' : 'incoming',
  status: p.status.toLowerCase(),
  createdAt: p.createdAt.toISOString(),
  listing: { id: p.listing.id, title: p.listing.title, sellerName: p.listing.seller.name, listPrice: p.listing.listPrice },
  request: {
    id: p.request.id, title: p.request.title, buyerName: p.request.buyer.name,
    deliverables: p.request.deliverables, deadline: p.request.deadline,
  },
  negotiationId: p.negotiationId ?? null,
  closedReason: p.closedReason ?? null,
})

const mineWhere = (side, userId) =>
  side === 'buyer' ? { request: { buyerId: userId } } : { listing: { sellerId: userId } }

// Loads a proposal and works out which side the caller is on (by owning its listing or request).
async function loadParty(req, res) {
  const p = await reload(req.params.id)
  if (!p) { fail(res, 404, 'NOT_FOUND', 'Proposal not found'); return null }
  const side = p.request.buyerId === req.user.id ? 'buyer' : p.listing.sellerId === req.user.id ? 'seller' : null
  if (!side) { fail(res, 403, 'FORBIDDEN', 'Not your proposal'); return null }
  return { p, side }
}

// Send a proposal
router.post('/proposals', who, h(async (req, res) => {
  const side = sideOf(req, res)
  if (!side) return
  const listing = await prisma.listing.findUnique({ where: { id: String(req.body.listingId ?? '') } })
  const request = await prisma.buyerRequest.findUnique({ where: { id: String(req.body.requestId ?? '') } })
  if (!listing || !request) return fail(res, 404, 'NOT_FOUND', 'Listing or request not found')
  if (side === 'buyer' && request.buyerId !== req.user.id) return fail(res, 403, 'FORBIDDEN', 'That request is not yours')
  if (side === 'seller' && listing.sellerId !== req.user.id) return fail(res, 403, 'FORBIDDEN', 'That listing is not yours')
  if (listing.sellerId === request.buyerId) return fail(res, 400, 'VALIDATION', "You can't negotiate with yourself")

  const dup = await prisma.proposal.findFirst({ where: { listingId: listing.id, requestId: request.id, status: 'PENDING' } })
  if (dup) {
    return fail(res, 400, 'VALIDATION', dup.sentBy.toLowerCase() === side
      ? 'You already sent this proposal. Wait for an answer.'
      : 'They already sent you this proposal. Accept theirs instead.')
  }
  if (await lockOf(listing.sellerId)) return fail(res, 409, 'SELLER_LOCKED', 'This seller is in another negotiation')
  if (await requestLockOf(request.id)) return fail(res, 409, 'REQUEST_LOCKED', 'This request is in another negotiation')

  const p = await prisma.proposal.create({
    data: { listingId: listing.id, requestId: request.id, sentBy: side.toUpperCase() },
  })
  res.status(201).json({ id: p.id })
}))

// Every proposal the caller sent or received as that side, newest first
router.get('/proposals', who, h(async (req, res) => {
  const side = sideOf(req, res)
  if (!side) return
  const rows = await prisma.proposal.findMany({
    where: mineWhere(side, req.user.id), orderBy: { createdAt: 'desc' }, include: INCLUDE,
  })
  res.json(rows.map(p => toProposal(p, side)))
}))

// The number on the "Proposals" link
router.get('/proposals/incoming-count', who, h(async (req, res) => {
  const side = sideOf(req, res)
  if (!side) return
  const count = await prisma.proposal.count({
    where: { status: 'PENDING', sentBy: side === 'buyer' ? 'SELLER' : 'BUYER', ...mineWhere(side, req.user.id) },
  })
  res.json({ count })
}))

// Accept: only the receiver. Creates the negotiation and closes the other pending proposals.
router.post('/proposals/:id/accept', who, h(async (req, res) => {
  const found = await loadParty(req, res)
  if (!found) return
  const { p, side } = found
  if (p.sentBy.toLowerCase() === side) return fail(res, 403, 'FORBIDDEN', 'Only the other side can accept')
  if (p.status !== 'PENDING') return fail(res, 400, 'VALIDATION', 'This proposal was already answered')
  if (p.listing.sellerId === p.request.buyerId) return fail(res, 400, 'VALIDATION', "You can't negotiate with yourself")

  let neg
  try {
    neg = await prisma.$transaction(async tx => {
      // Lock the seller and the request rows, always in this order, so two accepts cannot both win.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${p.listing.sellerId} FOR UPDATE`
      await tx.$queryRaw`SELECT id FROM "BuyerRequest" WHERE id = ${p.requestId} FOR UPDATE`

      const fresh = await tx.proposal.findUnique({ where: { id: p.id } })
      if (fresh.status !== 'PENDING') throw new Http(400, 'VALIDATION', 'This proposal was already answered')
      if (await lockOf(p.listing.sellerId, tx)) throw new Http(409, 'SELLER_LOCKED', 'This seller is in another negotiation')
      if (await requestLockOf(p.requestId, tx)) throw new Http(409, 'REQUEST_LOCKED', 'This request is in another negotiation')

      const created = await tx.negotiation.create({
        data: {
          listingId: p.listingId, buyerId: p.request.buyerId, status: 'IN_PROGRESS', currentRound: 1, maxRounds: MAX_ROUNDS,
          buyerTargetPrice: p.request.targetPrice, buyerMaxPrice: p.request.maxPrice,
        },
      })
      await tx.proposal.update({ where: { id: p.id }, data: { status: 'ACCEPTED', negotiationId: created.id } })
      // Every other pending proposal that uses the same listing or request is closed by itself.
      await tx.proposal.updateMany({
        where: { id: { not: p.id }, status: 'PENDING', OR: [{ listingId: p.listingId }, { requestId: p.requestId }] },
        data: { status: 'DECLINED', closedReason: 'taken' },
      })
      return created
    },{ maxWait: 15000, timeout: 30000 })
  } catch (e) {
    if (e instanceof Http) return fail(res, e.status, e.code, e.message)
    throw e
  }

  // 1. Load the updated proposal
  const reloadedProposal = await reload(p.id)
  
  // 2. Respond to the frontend IMMEDIATELY so the browser doesn't timeout
  res.json(toProposal(reloadedProposal, side))

  // 3. Run the AI agent trigger in the background
  setTimeout(async () => {
    try {
      await logEvent(neg.id, 'negotiation_started', { buyerId: neg.buyerId, via: 'proposal', proposalId: p.id })
      scheduleStep(neg.id)
    } catch (err) {
      console.error("Background agent error:", err)
    }
  }, 0)
}))
// Decline: only the receiver, only while pending
router.post('/proposals/:id/decline', who, h(async (req, res) => {
  const found = await loadParty(req, res)
  if (!found) return
  const { p, side } = found
  if (p.sentBy.toLowerCase() === side) return fail(res, 403, 'FORBIDDEN', 'Only the other side can decline. You can withdraw it instead.')
  const { count } = await prisma.proposal.updateMany({ where: { id: p.id, status: 'PENDING' }, data: { status: 'DECLINED' } })
  if (!count) return fail(res, 400, 'VALIDATION', 'This proposal was already answered')
  res.json(toProposal(await reload(p.id), side))
}))

// Withdraw: only the sender, only while pending
router.post('/proposals/:id/withdraw', who, h(async (req, res) => {
  const found = await loadParty(req, res)
  if (!found) return
  const { p, side } = found
  if (p.sentBy.toLowerCase() !== side) return fail(res, 403, 'FORBIDDEN', 'Only the sender can withdraw it')
  const { count } = await prisma.proposal.updateMany({ where: { id: p.id, status: 'PENDING' }, data: { status: 'WITHDRAWN' } })
  if (!count) return fail(res, 400, 'VALIDATION', 'This proposal was already answered')
  res.json(toProposal(await reload(p.id), side))
}))

export default router