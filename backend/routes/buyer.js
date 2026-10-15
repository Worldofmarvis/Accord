import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { fail, h } from '../lib/http.js'
import { as, only } from '../lib/auth.js'
import { STATUS_IN } from '../lib/negotiation.js'
import { buyerRequest } from '../lib/shapes.js'
import { parseRequest } from '../lib/validation.js'

const router = Router()

router.get('/buyer/requests', as('BUYER'), only('BUYER'), h(async (req, res) => {
  const rows = await prisma.buyerRequest.findMany({ where: { buyerId: req.user.id }, orderBy: { createdAt: 'asc' } })
  res.json(rows.map(buyerRequest))
}))

router.post('/buyer/requests', as('BUYER'), only('BUYER'), h(async (req, res) => {
  const parsed = parseRequest(req.body)
  if (parsed.error) return fail(res, 400, 'VALIDATION', parsed.error)
  const v = parsed.value
  const r = await prisma.buyerRequest.create({
    data: {
      buyerId: req.user.id, title: v.title, category: v.category, deliverables: v.deliverables,
      deadline: v.deadline, targetPrice: v.target, maxPrice: v.max,
    },
  })
  res.status(201).json(buyerRequest(r))
}))

router.get('/buyer/negotiations', as('BUYER'), only('BUYER'), h(async (req, res) => {
  const rows = await prisma.negotiation.findMany({
    where: { buyerId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      listing: { include: { seller: true } },
      offers: { orderBy: [{ roundNumber: 'asc' }, { offeredBy: 'asc' }] },
    },
  })
  const latest = (offers, by) => offers.filter(o => o.offeredBy === by).at(-1)?.proposedPrice ?? null
  res.json(rows.map(n => ({
    id: n.id, service: n.listing.title, sellerName: n.listing.seller.name,
    status: STATUS_IN[n.status], round: n.currentRound, maxRounds: n.maxRounds,
    buyerOffer: latest(n.offers, 'BUYER_AGENT'), sellerOffer: latest(n.offers, 'SELLER_AGENT'),
  })))
}))

export default router
