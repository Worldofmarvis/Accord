import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { fail, h } from '../lib/http.js'
import { negotiationRoute } from '../lib/auth.js'
import { logEvent } from '../lib/negotiation.js'

const router = Router()

const overall = a =>
  a.buyer === 'declined' || a.seller === 'declined' ? 'declined'
  : a.buyer === 'approved' && a.seller === 'approved' ? 'approved' : 'pending'

const shape = (a, n) => ({
  negotiationId: n.id, agreedPrice: n.agreedPrice, buyer: a.buyer, seller: a.seller, status: overall(a),
})

// Both decisions start as "pending" the first time anyone asks for them.
const getApproval = id => prisma.dealApproval.upsert({
  where: { negotiationId: id }, create: { negotiationId: id }, update: {},
})

const agreedOnly = (req, res) => {
  if (req.neg.status === 'agreed') return true
  fail(res, 400, 'VALIDATION', 'There is no agreed price yet')
  return false
}

router.get('/negotiations/:id/approval', negotiationRoute, h(async (req, res) => {
  if (!agreedOnly(req, res)) return
  res.json(shape(await getApproval(req.neg.id), req.neg))
}))

const answer = value => h(async (req, res) => {
  if (!agreedOnly(req, res)) return
  const n = req.neg
  const current = await getApproval(n.id)
  if (overall(current) === 'declined') return fail(res, 400, 'VALIDATION', 'This deal was already declined')
  // Only changes the row if this side is still "pending", so a double click can't answer twice.
  const { count } = await prisma.dealApproval.updateMany({
    where: { negotiationId: n.id, [req.side]: 'pending' },
    data: { [req.side]: value },
  })
  if (!count) return fail(res, 400, 'VALIDATION', 'You already answered')
  if (value === 'declined') {
    // Ends the deal and releases the seller lock.
    await prisma.negotiation.update({ where: { id: n.id }, data: { status: 'CANCELLED' } })
  }
  await logEvent(n.id, `deal_${value}`, { side: req.side })
  res.json(shape(await getApproval(n.id), n))
})

router.post('/negotiations/:id/approval/approve', negotiationRoute, answer('approved'))
router.post('/negotiations/:id/approval/decline', negotiationRoute, answer('declined'))

export default router