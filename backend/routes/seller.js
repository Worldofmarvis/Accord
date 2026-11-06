import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { fail, h } from '../lib/http.js'
import { as, only } from '../lib/auth.js'
import { lockOf } from '../lib/locks.js'
import { lockedRequestIds } from '../lib/locks.js'
import { sellerListing } from '../lib/shapes.js'
import { parseListing } from '../lib/validation.js'
import { STATUS_IN } from '../lib/negotiation.js'

const router = Router()

router.get('/seller/listings', as('SELLER'), only('SELLER'), h(async (req, res) => {
  const rows = await prisma.listing.findMany({ where: { sellerId: req.user.id }, orderBy: { createdAt: 'asc' } })
  res.json(rows.map(sellerListing))
}))

router.post('/seller/listings', as('SELLER'), only('SELLER'), h(async (req, res) => {
  const parsed = parseListing(req.body)
  if (parsed.error) return fail(res, 400, 'VALIDATION', parsed.error)
  const v = parsed.value
  const l = await prisma.listing.create({
    data: {
      sellerId: req.user.id, title: v.title, category: v.category, deliverables: v.deliverables,
      listPrice: v.listPrice, floorPrice: v.priceFloor, deliveryDays: v.deliveryDays,
      description: String(req.body.description ?? v.deliverables),
      tags: [...new Set(v.title.toLowerCase().split(/\W+/).filter(w => w.length > 3))],
    },
  })
  res.status(201).json(sellerListing(l))
}))

router.put('/seller/listings/:id', as('SELLER'), only('SELLER'), h(async (req, res) => {
  const l = await prisma.listing.findUnique({ where: { id: req.params.id } })
  if (!l) return fail(res, 404, 'NOT_FOUND', 'Listing not found')
  if (l.sellerId !== req.user.id) return fail(res, 403, 'FORBIDDEN', 'Not your listing')
  if ((await lockOf(l.sellerId))?.listingId === l.id) return fail(res, 409, 'SELLER_LOCKED', 'This listing is in an active negotiation')
  const parsed = parseListing(req.body, sellerListing(l))
  if (parsed.error) return fail(res, 400, 'VALIDATION', parsed.error)
  const v = parsed.value
  const updated = await prisma.listing.update({
    where: { id: l.id },
    data: {
      title: v.title, category: v.category, deliverables: v.deliverables,
      listPrice: v.listPrice, floorPrice: v.priceFloor, deliveryDays: v.deliveryDays,
    },
  })
  res.json(sellerListing(updated))
}))

router.get('/seller/active-negotiation', as('SELLER'), only('SELLER'), h(async (req, res) => {
  const n = await lockOf(req.user.id)
  res.json(n ? { negotiationId: n.id, listingId: n.listingId, round: n.currentRound, maxRounds: n.maxRounds } : null)
}))

// Sellers search what buyers need. Public fields only: never target, max or any budget hint.
router.get('/requests', as('SELLER'), only('SELLER'), h(async (req, res) => {
  const { keyword = '', category = '', sort = 'match' } = req.query
  const words = String(keyword).toLowerCase().split(/\s+/).filter(Boolean)

  const rows = await prisma.buyerRequest.findMany({
    where: category ? { category: { equals: String(category), mode: 'insensitive' } } : {},
  })
  const [buyers, locked] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: [...new Set(rows.map(r => r.buyerId))] } } }),
    lockedRequestIds(),
  ])
  const nameOf = new Map(buyers.map(u => [u.id, u.name]))
  const day = d => (d instanceof Date ? d.toISOString().slice(0, 10) : d)

  const score = (r, name) => words.reduce((sum, w) => {
    const hit = (text, pts) => (String(text ?? '').toLowerCase().includes(w) ? pts : 0)
    const s = hit(r.title, 3) + hit(r.category, 2) + hit(name, 2) + hit(r.deliverables, 1)
    return sum === null || s === 0 ? null : sum + s   // every word must match
  }, 0)

  const found = rows
    .map(r => ({ r, name: nameOf.get(r.buyerId) ?? '', s: words.length ? null : 0 }))
    .map(x => ({ ...x, s: words.length ? score(x.r, x.name) : 0 }))
    .filter(x => x.s !== null)

  found.sort((a, b) =>
    sort === 'deadline' ? String(day(a.r.deadline)).localeCompare(String(day(b.r.deadline))) :
    b.s - a.s || String(day(a.r.deadline)).localeCompare(String(day(b.r.deadline))))

  res.json(found.map(({ r, name }) => ({
    id: r.id, title: r.title, buyerName: name, category: r.category,
    deliverables: r.deliverables ?? '', deadline: day(r.deadline),
    locked: locked.has(r.id), mine: r.buyerId === req.user.id,
  })))
}))

// The seller's whole history, newest first. Never includes the buyer's target or max.
router.get('/seller/negotiations', as('SELLER'), only('SELLER'), h(async (req, res) => {
  const rows = await prisma.negotiation.findMany({
    where: { listing: { sellerId: req.user.id } },
    orderBy: { createdAt: 'desc' },
    include: {
      buyer: true,
      listing: true,
      offers: { orderBy: [{ roundNumber: 'asc' }, { offeredBy: 'asc' }] },
      approval: true,
    },
  })

  const latest = (offers, by) => offers.filter(o => o.offeredBy === by).at(-1)?.proposedPrice ?? null
  const dealOf = a =>
    !a ? 'pending'
    : a.buyer === 'declined' || a.seller === 'declined' ? 'declined'
    : a.buyer === 'approved' && a.seller === 'approved' ? 'approved' : 'pending'

  // Built field by field, so nothing private can slip in.
  res.json(rows.map(n => {
    const status = STATUS_IN[n.status]
    return {
      id: n.id,
      service: n.listing.title,
      buyerName: n.buyer.name,
      status,
      round: n.currentRound,
      maxRounds: n.maxRounds,
      buyerOffer: latest(n.offers, 'BUYER_AGENT'),
      sellerOffer: latest(n.offers, 'SELLER_AGENT'),
      agreedPrice: status === 'agreed' ? n.finalPrice : null,
      deal: status === 'agreed' ? dealOf(n.approval) : null,
    }
  }))
}))

// The seller's sales history: every negotiation that is settled or over (not the active one), newest first.
router.get('/seller/sales', as('SELLER'), only('SELLER'), h(async (req, res) => {
  const rows = await prisma.negotiation.findMany({
    where: { listing: { sellerId: req.user.id }, status: { notIn: ['OPEN', 'IN_PROGRESS'] } },
    include: { buyer: true, listing: true, approval: true, payments: { orderBy: { createdAt: 'desc' } } },
  })

  const sales = rows.map(n => {
    const a = n.approval
    const paid = n.payments.find(p => p.status === 'COMPLETED')
    const declined = a && (a.buyer === 'declined' || a.seller === 'declined')
    const bothApproved = a && a.buyer === 'approved' && a.seller === 'approved'
    const outcome =
      STATUS_IN[n.status] !== 'agreed' ? 'no_agreement'
      : declined ? 'declined'
      : paid ? 'paid'
      : bothApproved ? 'awaiting_payment'
      : 'awaiting_approval'

    return {
      id: n.id,
      date: (paid?.createdAt ?? n.updatedAt).toISOString(),   // paidAt does not exist yet, so the payment's createdAt stands in
      service: n.listing.title,
      buyerName: n.buyer.name,
      listPrice: n.listing.listPrice,
      priceFloor: n.listing.floorPrice,                       // the seller's OWN floor, never the buyer's limits
      agreedPrice: outcome === 'no_agreement' ? null : n.finalPrice,
      rounds: Math.min(n.currentRound, n.maxRounds),
      outcome,
    }
  })

  sales.sort((x, y) => y.date.localeCompare(x.date))
  res.json(sales)
}))

export default router
