import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { createOrder, captureOrder, paypalMode, paypalClientId } from '../payments.js'
import { fail, h } from '../lib/http.js'
import { negotiationRoute } from '../lib/auth.js'
import { loadNeg, logEvent, view } from '../lib/negotiation.js'

const router = Router()

// Payments (not in API.md yet: add them there)
router.get('/payments/config', (req, res) =>
  res.json({ mode: paypalMode(), clientId: paypalClientId(), currency: 'USD' }))

router.post('/negotiations/:id/pay', negotiationRoute, h(async (req, res) => {
  const n = req.neg
  if (req.side !== 'buyer') return fail(res, 403, 'FORBIDDEN', 'Only the buyer pays')
  if (n.status !== 'agreed') return fail(res, 409, 'VALIDATION', 'There is no agreed price to pay yet')
  if (n.paid) return fail(res, 409, 'VALIDATION', 'Already paid')
  try {
    const order = await createOrder(n.agreedPrice, n.service, n.id)
    await prisma.payment.create({
      data: { negotiationId: n.id, paypalOrderId: order.id, amount: Math.round(n.agreedPrice), status: 'PENDING' },
    })
    await logEvent(n.id, 'order_created', { orderId: order.id, amount: n.agreedPrice })
    res.status(201).json({ orderId: order.id, amount: n.agreedPrice, mode: paypalMode() })
  } catch (e) {
    fail(res, 502, 'PAYPAL_ERROR', e.message)
  }
}))

router.post('/negotiations/:id/capture', negotiationRoute, h(async (req, res) => {
  const n = req.neg
  if (req.side !== 'buyer') return fail(res, 403, 'FORBIDDEN', 'Only the buyer pays')
  if (n.paid) return res.json(view(n, 'buyer'))                 // safe to call twice
  if (!n.orderId || n.orderId !== req.body.orderId) return fail(res, 400, 'VALIDATION', 'Unknown orderId')
  try {
    const result = await captureOrder(n.orderId)
    if (result.status !== 'COMPLETED') return fail(res, 402, 'PAYPAL_ERROR', `Payment ${result.status}`)
    await prisma.payment.update({ where: { paypalOrderId: n.orderId }, data: { status: 'COMPLETED' } })
    await logEvent(n.id, 'payment_completed', { orderId: n.orderId })
    res.json(view(await loadNeg(n.id), 'buyer'))
  } catch (e) {
    fail(res, 502, 'PAYPAL_ERROR', e.message)
  }
}))

export default router
