import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { h } from '../lib/http.js'
import { lockedSellerIds } from '../lib/locks.js'
import { publicListing } from '../lib/shapes.js'

const router = Router()

// The demo users, so the front end can pick who it is acting as (sent later as X-User-Id).
router.get('/users/demo', h(async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } })
  res.json(users.map(u => ({ id: u.id, name: u.name, role: u.role.toLowerCase() })))
}))

// Search
const score = (l, words) => words.reduce((sum, w) =>
  sum + (l.title.toLowerCase().includes(w) ? 3 : 0) + (l.tags.some(t => t.includes(w)) ? 2 : 0) +
  (l.category.toLowerCase().includes(w) ? 2 : 0) + ((l.description ?? '').toLowerCase().includes(w) ? 1 : 0), 0)

router.get('/listings', h(async (req, res) => {
  const { keyword = '', category = '', maxPrice = '', sort = 'match' } = req.query
  const words = String(keyword).toLowerCase().split(/\s+/).filter(Boolean)
  const where = {
    ...(category ? { category: { equals: String(category), mode: 'insensitive' } } : {}),
    ...(maxPrice && Number.isFinite(Number(maxPrice)) ? { listPrice: { lte: Number(maxPrice) } } : {}),
  }
  const [rows, locked] = await Promise.all([
    prisma.listing.findMany({ where, include: { seller: true } }),
    lockedSellerIds(),
  ])
  const found = rows
    .map(l => ({ l, score: score(l, words) }))
    .filter(({ score }) => !words.length || score > 0)
  found.sort((a, b) =>
    sort === 'price' ? a.l.listPrice - b.l.listPrice :
    sort === 'delivery' ? a.l.deliveryDays - b.l.deliveryDays :
    b.score - a.score || a.l.listPrice - b.l.listPrice)
  res.json(found.map(({ l }) => publicListing(l, locked)))
}))

export default router
