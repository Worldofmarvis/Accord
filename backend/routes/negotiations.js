import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { MAX_ROUNDS } from '../engine.js'
import { fail, h } from '../lib/http.js'
import { as, only, negotiationRoute } from '../lib/auth.js'
import { lockOf, lockedSellerIds } from '../lib/locks.js'
import { view, logEvent } from '../lib/negotiation.js'
import { scheduleStep } from '../lib/runner.js'

const router = Router()



// Live view
router.get('/negotiations/:id', negotiationRoute, (req, res) => res.json(view(req.neg, req.side)))

// Session ended
async function rematchesFor(n) {
  const [rows, locked] = await Promise.all([
    prisma.listing.findMany({
      where: {
        id: { not: n.listingId }, sellerId: { not: n.sellerId }, category: n.category,
        floorPrice: { lte: n.limits.buyerMax },   // limits are checked here, never shown
      },
      include: { seller: true },
      orderBy: { listPrice: 'asc' },
    }),
    lockedSellerIds(),
  ])
  return rows
    .filter(l => !locked.has(l.sellerId))
    .slice(0, 3)
    .map(l => ({
      listingId: l.id, title: l.title, sellerName: l.seller.name, listPrice: l.listPrice,
      reasons: [`Same category: ${l.category}`, 'Available now', `Delivery in ${l.deliveryDays} days`],
    }))
}

router.get('/negotiations/:id/outcome', negotiationRoute, h(async (req, res) => {
  const n = req.neg
  if (n.status !== 'no_agreement') return fail(res, 409, 'VALIDATION', 'This negotiation did not end without an agreement')
  const rounds = []
  for (const o of n.offers) {
    let r = rounds.find(x => x.round === o.round)
    if (!r) rounds.push(r = { round: o.round, buyer: null, seller: null })
    r[o.role] = o.amount
  }
  res.json({ id: n.id, service: n.service, sellerName: n.sellerName, rounds, rematches: await rematchesFor(n) })
}))

// Chat (text only. It can never change a price)
const chatMsg = (m, n) => ({
  id: m.id,
  from: m.senderId ? (m.senderId === n.buyerId ? 'buyer' : 'seller') : 'system',
  sentAt: m.createdAt.toISOString(),
  text: m.content,
  ...(m.tone ? { tone: m.tone } : {}),
})
const looksLikePrice = t => /\$\s*\d|\b\d{2,}\s*(usd|dollars?|bucks)\b/i.test(t)

router.get('/negotiations/:id/messages', negotiationRoute, h(async (req, res) => {
  const list = await prisma.message.findMany({ where: { negotiationId: req.neg.id }, orderBy: { createdAt: 'asc' } })
  const i = req.query.after ? list.findIndex(m => m.id === req.query.after) : -1
  res.json((i >= 0 ? list.slice(i + 1) : list).map(m => chatMsg(m, req.neg)))
}))

router.post('/negotiations/:id/messages', negotiationRoute, h(async (req, res) => {
  const body = String(req.body.text ?? '').trim()
  if (!body || body.length > 500) return fail(res, 400, 'VALIDATION', 'text is required and must be at most 500 characters')
  const msg = await prisma.message.create({
    data: { negotiationId: req.neg.id, senderId: req.user.id, content: body },
  })
  if (looksLikePrice(body)) {
    await prisma.message.create({
      data: {
        negotiationId: req.neg.id, senderId: null, tone: 'warning',
        content: 'Chat cannot change the price. Only the negotiation engine sets prices.',
      },
    })
  }
  res.status(201).json(chatMsg(msg, req.neg))
}))

export default router
