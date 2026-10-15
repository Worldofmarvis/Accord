import { prisma } from './prisma.js'
import { fail, h } from './http.js'
import { loadNeg } from './negotiation.js'

// Who is calling? The browser sends X-User-Id (the user's real id from /api/users/demo).
// If it is missing we fall back to the first user of the expected role (handy for demos).
export async function currentUser(req, fallback) {
  const raw = req.headers['x-user-id']
  return raw ? prisma.user.findUnique({ where: { id: String(raw) } }) : fallback()
}

export const as = defaultRole => h(async (req, res, next) => {
  const user = await currentUser(req, () =>
    prisma.user.findFirst({ where: { role: defaultRole }, orderBy: { createdAt: 'asc' } }))
  if (!user) return fail(res, 401, 'UNAUTHENTICATED', 'Unknown X-User-Id')
  req.user = user
  next()
})

export const only = role => (req, res, next) =>
  (req.user.roles?.includes(role) || req.user.role === role)
    ? next()
    : fail(res, 403, 'FORBIDDEN', `Only a ${role.toLowerCase()} can do this`)

// Loads the negotiation and checks the caller is the buyer or the seller of it.
export const negotiationRoute = h(async (req, res, next) => {
  const n = await loadNeg(req.params.id)
  if (!n) return fail(res, 404, 'NOT_FOUND', 'Negotiation not found')
  const user = await currentUser(req, () => prisma.user.findUnique({ where: { id: n.buyerId } }))
  if (!user) return fail(res, 401, 'UNAUTHENTICATED', 'Unknown X-User-Id')
  if (![n.buyerId, n.sellerId].includes(user.id)) return fail(res, 403, 'FORBIDDEN', 'Not your negotiation')
  req.user = user
  req.neg = n
  req.side = user.id === n.buyerId ? 'buyer' : 'seller'
  next()
})
