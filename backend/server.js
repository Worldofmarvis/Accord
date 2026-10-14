import express from 'express'
import { MAX_ROUNDS, applyOffer, audit } from './engine.js'
import { proposeOffer, contextFor, ruleBased } from './agent.js'
import { createOrder, captureOrder, paypalMode, paypalClientId } from './payments.js'

const app = express()
app.use(express.json())
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-User-Id')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

const STEP_MS = Number(process.env.STEP_MS ?? 2500)   // time between agent offers
const LOCK_MS = 10 * 60 * 1000                         // an agreed, unpaid deal holds the lock this long

// ---------- Temporary in-memory data (Person A's database replaces this later) ----------
const users = [
  { id: 'u1', name: 'Maya Santos', role: 'seller' },
  { id: 'u2', name: 'Daniel Reyes', role: 'seller' },
  { id: 'u3', name: 'Alex Kim', role: 'buyer' },
  { id: 'u4', name: 'Priya Shah', role: 'buyer' },
  { id: 'u5', name: 'Amara Osei', role: 'seller' },
  { id: 'u6', name: 'Liam Cruz', role: 'seller' },
]
const db = { listings: [], requests: [], negotiations: [], messages: [] }
let seq = {}
const newId = prefix => `${prefix}${++seq[prefix]}`
const nameOf = id => users.find(u => u.id === id)?.name

function makeNegotiation(listing, request, buyerId) {
  return {
    id: newId('n'), listingId: listing.id, sellerId: listing.sellerId, buyerId, requestId: request.id,
    service: listing.title, sellerName: nameOf(listing.sellerId), listPrice: listing.listPrice,
    status: 'active', round: 1, maxRounds: MAX_ROUNDS, waitingOn: 'buyer',
    limits: { buyerTarget: request.target, buyerMax: request.max, sellerFloor: listing.priceFloor },
    offers: [], audit: [], agreedPrice: null, paid: false, orderId: null,
    createdAt: Date.now(), closedAt: null,
  }
}

function seed() {
  seq = { l: 6, r: 2, n: 0, m: 0 }
  db.listings = [
    { id: 'l1', sellerId: 'u1', title: '5-page business website', category: 'Web development',
      tags: ['website', 'business', 'cms'], deliverables: '5 pages, contact form, CMS setup',
      description: 'Responsive site with contact form, simple CMS setup and launch support.',
      listPrice: 500, priceFloor: 350, deliveryDays: 7 },
    { id: 'l2', sellerId: 'u2', title: 'Portfolio website for creatives', category: 'Web development',
      tags: ['website', 'portfolio'], deliverables: 'Gallery, about page, contact form',
      description: 'Gallery layout, about page and contact form, built to be easy to update.',
      listPrice: 450, priceFloor: 380, deliveryDays: 10 },
    { id: 'l3', sellerId: 'u6', title: 'Landing page website in 3 days', category: 'Web development',
      tags: ['website', 'landing page'], deliverables: 'One landing page with a sign-up form',
      description: 'One fast, clean landing page with a sign-up form.',
      listPrice: 300, priceFloor: 220, deliveryDays: 3 },
    { id: 'l4', sellerId: 'u5', title: 'Logo and brand kit', category: 'Design',
      tags: ['logo', 'branding'], deliverables: 'Logo, colors, fonts',
      description: 'A simple logo with colors and fonts for a small brand.',
      listPrice: 250, priceFloor: 180, deliveryDays: 5 },
    { id: 'l5', sellerId: 'u5', title: 'Small business website', category: 'Web development',
      tags: ['website', 'small business'], deliverables: '3 pages and a contact form',
      description: 'A simple 3-page site for a small shop or service.',
      listPrice: 350, priceFloor: 280, deliveryDays: 8 },
    { id: 'l6', sellerId: 'u6', title: 'Blog article pack (5 posts)', category: 'Writing',
      tags: ['blog', 'articles'], deliverables: '5 blog posts of 600 words',
      description: 'Five researched blog posts with light editing.',
      listPrice: 200, priceFloor: 140, deliveryDays: 6 },
  ]
  db.requests = [
    { id: 'r1', buyerId: 'u3', title: 'Website for my bakery', category: 'Web development',
      deliverables: '5 pages, contact form, blog', deadline: '2026-10-30', target: 350, max: 400 },
    { id: 'r2', buyerId: 'u4', title: 'Portfolio site', category: 'Web development',
      deliverables: 'Gallery and contact page', deadline: '2026-10-30', target: 300, max: 380 },
  ]
  // Daniel starts "locked" for the demo. No runner is started, so it stays active.
  db.negotiations = [makeNegotiation(db.listings[1], db.requests[1], 'u4')]
  db.messages = []
}
seed()

// ---------- Helpers ----------
const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } })

const holdsLock = n =>
  n.status === 'active' || (n.status === 'agreed' && !n.paid && Date.now() - n.closedAt < LOCK_MS)
const lockOf = sellerId => db.negotiations.find(n => n.sellerId === sellerId && holdsLock(n))

// Who is calling? Use X-User-Id if sent, otherwise a default demo user.
const as = defaultId => (req, res, next) => {
  const raw = req.headers['x-user-id']
  const id = raw ? (String(raw).startsWith('u') ? String(raw) : `u${raw}`) : defaultId
  const user = users.find(u => u.id === id)
  if (!user) return fail(res, 401, 'UNAUTHENTICATED', 'Unknown X-User-Id')
  req.user = user
  next()
}
const only = role => (req, res, next) =>
  req.user.role === role ? next() : fail(res, 403, 'FORBIDDEN', `Only a ${role} can do this`)

// Loads the negotiation and checks the caller is the buyer or the seller of it.
function negotiationRoute(req, res, next) {
  const n = db.negotiations.find(x => x.id === req.params.id)
  if (!n) return fail(res, 404, 'NOT_FOUND', 'Negotiation not found')
  req.neg = n
  as(n.buyerId)(req, res, () => {
    if (![n.buyerId, n.sellerId].includes(req.user.id)) return fail(res, 403, 'FORBIDDEN', 'Not your negotiation')
    req.side = req.user.id === n.buyerId ? 'buyer' : 'seller'
    next()
  })
}

// ---------- What each side is allowed to see ----------
const publicListing = l => ({
  id: l.id, title: l.title, sellerName: nameOf(l.sellerId), description: l.description,
  categories: [l.category], tags: l.tags, listPrice: l.listPrice, deliveryDays: l.deliveryDays,
  locked: !!lockOf(l.sellerId),
})
const sellerListing = ({ id, title, category, deliverables, listPrice, priceFloor, deliveryDays }) =>
  ({ id, title, category, deliverables, listPrice, priceFloor, deliveryDays })
const buyerRequest = ({ id, title, category, deliverables, deadline, target, max }) =>
  ({ id, title, category, deliverables, deadline, target, max })

// "blocked" details are only shown to the side that made the offer.
function view(n, side) {
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

// ---------- Validation ----------
function parseListing(b, base = {}) {
  const v = {
    title: String(b.title ?? base.title ?? '').trim(),
    category: String(b.category ?? base.category ?? '').trim(),
    deliverables: b.deliverables ?? base.deliverables ?? '',
    listPrice: Number(b.listPrice ?? base.listPrice),
    priceFloor: Number(b.priceFloor ?? base.priceFloor),
    deliveryDays: Number(b.deliveryDays ?? base.deliveryDays ?? 7),
  }
  if (!v.title || !v.category) return { error: 'title and category are required' }
  if (![v.listPrice, v.priceFloor, v.deliveryDays].every(Number.isInteger) ||
      v.listPrice <= 0 || v.priceFloor <= 0 || v.deliveryDays <= 0) {
    return { error: 'listPrice, priceFloor and deliveryDays must be positive whole numbers' }
  }
  if (v.priceFloor > v.listPrice) return { error: 'priceFloor must be less than or equal to listPrice' }
  return { value: v }
}

function parseRequest(b) {
  const v = {
    title: String(b.title ?? '').trim(),
    category: String(b.category ?? '').trim(),
    deliverables: b.deliverables ?? '',
    deadline: String(b.deadline ?? ''),
    target: Number(b.target),
    max: Number(b.max),
  }
  if (!v.title || !v.category) return { error: 'title and category are required' }
  if (![v.target, v.max].every(Number.isInteger) || v.target <= 0) return { error: 'target and max must be positive whole dollars' }
  if (v.max < v.target) return { error: 'max must be greater than or equal to target' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.deadline) || v.deadline < new Date().toISOString().slice(0, 10)) {
    return { error: 'deadline must be a date (YYYY-MM-DD) that is not in the past' }
  }
  return { value: v }
}

// ---------- The agents take turns, one offer every STEP_MS, so the screen can show it live ----------
function scheduleStep(n) {
  setTimeout(() => step(n).catch(console.error), STEP_MS)
}

async function step(n) {
  if (n.status !== 'active') return
  const role = n.waitingOn
  let proposal = null
  try { proposal = await proposeOffer(n, role) } catch (e) { console.error('agent failed:', e.message) }
  if (!Number.isFinite(proposal?.price)) proposal = ruleBased(contextFor(n, role))
  applyOffer(n, role, proposal.price, proposal.note)
  if (n.status === 'active') scheduleStep(n)
}

// ---------- Routes ----------
app.get(['/health', '/api/health'], (req, res) => res.json({ status: 'ok' }))

app.get('/api/users/demo', (req, res) => res.json(users))

// Search
const score = (l, words) => words.reduce((sum, w) =>
  sum + (l.title.toLowerCase().includes(w) ? 3 : 0) + (l.tags.some(t => t.includes(w)) ? 2 : 0) +
  (l.category.toLowerCase().includes(w) ? 2 : 0) + (l.description.toLowerCase().includes(w) ? 1 : 0), 0)

app.get('/api/listings', (req, res) => {
  const { keyword = '', category = '', maxPrice = '', sort = 'match' } = req.query
  const words = String(keyword).toLowerCase().split(/\s+/).filter(Boolean)
  const found = db.listings
    .map(l => ({ l, score: score(l, words) }))
    .filter(({ l, score }) =>
      (!words.length || score > 0) &&
      (!category || l.category.toLowerCase() === String(category).toLowerCase()) &&
      (!maxPrice || l.listPrice <= Number(maxPrice)))
  found.sort((a, b) =>
    sort === 'price' ? a.l.listPrice - b.l.listPrice :
    sort === 'delivery' ? a.l.deliveryDays - b.l.deliveryDays :
    b.score - a.score || a.l.listPrice - b.l.listPrice)
  res.json(found.map(({ l }) => publicListing(l)))
})

// Buyer dashboard
app.get('/api/buyer/requests', as('u3'), only('buyer'), (req, res) =>
  res.json(db.requests.filter(r => r.buyerId === req.user.id).map(buyerRequest)))

app.post('/api/buyer/requests', as('u3'), only('buyer'), (req, res) => {
  const parsed = parseRequest(req.body)
  if (parsed.error) return fail(res, 400, 'VALIDATION', parsed.error)
  const r = { id: newId('r'), buyerId: req.user.id, ...parsed.value }
  db.requests.push(r)
  res.status(201).json(buyerRequest(r))
})

app.get('/api/buyer/negotiations', as('u3'), only('buyer'), (req, res) =>
  res.json(db.negotiations.filter(n => n.buyerId === req.user.id).map(n => ({
    id: n.id, service: n.service, sellerName: n.sellerName, status: n.status, round: n.round, maxRounds: n.maxRounds,
    buyerOffer: [...n.offers].reverse().find(o => o.role === 'buyer')?.amount ?? null,
    sellerOffer: [...n.offers].reverse().find(o => o.role === 'seller')?.amount ?? null,
  }))))

// Seller dashboard
app.get('/api/seller/listings', as('u1'), only('seller'), (req, res) =>
  res.json(db.listings.filter(l => l.sellerId === req.user.id).map(sellerListing)))

app.post('/api/seller/listings', as('u1'), only('seller'), (req, res) => {
  const parsed = parseListing(req.body)
  if (parsed.error) return fail(res, 400, 'VALIDATION', parsed.error)
  const v = parsed.value
  const l = {
    id: newId('l'), sellerId: req.user.id, ...v,
    description: String(req.body.description ?? (Array.isArray(v.deliverables) ? v.deliverables.join(', ') : v.deliverables)),
    tags: [...new Set(v.title.toLowerCase().split(/\W+/).filter(w => w.length > 3))],
  }
  db.listings.push(l)
  res.status(201).json(sellerListing(l))
})

app.put('/api/seller/listings/:id', as('u1'), only('seller'), (req, res) => {
  const l = db.listings.find(x => x.id === req.params.id)
  if (!l) return fail(res, 404, 'NOT_FOUND', 'Listing not found')
  if (l.sellerId !== req.user.id) return fail(res, 403, 'FORBIDDEN', 'Not your listing')
  if (lockOf(l.sellerId)?.listingId === l.id) return fail(res, 409, 'SELLER_LOCKED', 'This listing is in an active negotiation')
  const parsed = parseListing(req.body, l)
  if (parsed.error) return fail(res, 400, 'VALIDATION', parsed.error)
  Object.assign(l, parsed.value)
  res.json(sellerListing(l))
})

app.get('/api/seller/active-negotiation', as('u1'), only('seller'), (req, res) => {
  const n = lockOf(req.user.id)
  res.json(n ? { negotiationId: n.id, listingId: n.listingId, round: n.round, maxRounds: n.maxRounds } : null)
})

// Negotiations
app.post('/api/negotiations', as('u3'), only('buyer'), (req, res) => {
  const listing = db.listings.find(l => l.id === String(req.body.listingId))
  if (!listing) return fail(res, 404, 'NOT_FOUND', 'Listing not found')

  const mine = db.requests.filter(r => r.buyerId === req.user.id)
  const request = req.body.requestId ? mine.find(r => r.id === String(req.body.requestId)) : mine.at(-1)
  if (req.body.requestId && !request) return fail(res, 404, 'NOT_FOUND', 'Request not found')
  if (!request) return fail(res, 400, 'VALIDATION', 'Create a request first')

  if (lockOf(listing.sellerId)) return fail(res, 409, 'SELLER_LOCKED', 'This seller is in another negotiation')

  const n = makeNegotiation(listing, request, req.user.id)
  audit(n, 'negotiation_started', { buyerId: req.user.id })
  db.negotiations.push(n)
  scheduleStep(n)
  res.status(201).json({ id: n.id })
})

app.get('/api/negotiations/:id', negotiationRoute, (req, res) => res.json(view(req.neg, req.side)))

function rematchesFor(n) {
  const listing = db.listings.find(l => l.id === n.listingId)
  if (!listing) return []
  return db.listings
    .filter(l => l.id !== listing.id && l.sellerId !== n.sellerId && l.category === listing.category &&
                 !lockOf(l.sellerId) && l.priceFloor <= n.limits.buyerMax)   // limits are checked here, never shown
    .sort((a, b) => a.listPrice - b.listPrice)
    .slice(0, 3)
    .map(l => ({
      listingId: l.id, title: l.title, sellerName: nameOf(l.sellerId), listPrice: l.listPrice,
      reasons: [`Same category: ${l.category}`, 'Available now', `Delivery in ${l.deliveryDays} days`],
    }))
}

app.get('/api/negotiations/:id/outcome', negotiationRoute, (req, res) => {
  const n = req.neg
  if (n.status !== 'no_agreement') return fail(res, 409, 'VALIDATION', 'This negotiation did not end without an agreement')
  const rounds = []
  for (const o of n.offers) {
    let r = rounds.find(x => x.round === o.round)
    if (!r) rounds.push(r = { round: o.round, buyer: null, seller: null })
    r[o.role] = o.amount
  }
  res.json({ id: n.id, service: n.service, sellerName: n.sellerName, rounds, rematches: rematchesFor(n) })
})

// Chat (text only. It can never change a price)
const chatView = ({ negotiationId, ...m }) => m
const looksLikePrice = text => /\$\s*\d|\b\d{2,}\s*(usd|dollars?|bucks)\b/i.test(text)

app.get('/api/negotiations/:id/messages', negotiationRoute, (req, res) => {
  const list = db.messages.filter(m => m.negotiationId === req.neg.id)
  const i = req.query.after ? list.findIndex(m => m.id === req.query.after) : -1
  res.json((i >= 0 ? list.slice(i + 1) : list).map(chatView))
})

app.post('/api/negotiations/:id/messages', negotiationRoute, (req, res) => {
  const text = String(req.body.text ?? '').trim()
  if (!text || text.length > 500) return fail(res, 400, 'VALIDATION', 'text is required and must be at most 500 characters')
  const sentAt = new Date().toISOString()
  const msg = { id: newId('m'), negotiationId: req.neg.id, from: req.side, sentAt, text }
  db.messages.push(msg)
  if (looksLikePrice(text)) {
    db.messages.push({
      id: newId('m'), negotiationId: req.neg.id, from: 'system', sentAt, tone: 'warning',
      text: 'Chat cannot change the price. Only the negotiation engine sets prices.',
    })
  }
  res.status(201).json(chatView(msg))
})

// Payments (not in API.md yet: add them there)
app.get('/api/payments/config', (req, res) =>
  res.json({ mode: paypalMode(), clientId: paypalClientId(), currency: 'USD' }))

app.post('/api/negotiations/:id/pay', negotiationRoute, async (req, res) => {
  const n = req.neg
  if (req.side !== 'buyer') return fail(res, 403, 'FORBIDDEN', 'Only the buyer pays')
  if (n.status !== 'agreed') return fail(res, 409, 'VALIDATION', 'There is no agreed price to pay yet')
  if (n.paid) return fail(res, 409, 'VALIDATION', 'Already paid')
  try {
    const order = await createOrder(n.agreedPrice, n.service, n.id)
    n.orderId = order.id
    audit(n, 'order_created', { orderId: order.id, amount: n.agreedPrice })
    res.status(201).json({ orderId: order.id, amount: n.agreedPrice, mode: paypalMode() })
  } catch (e) {
    fail(res, 502, 'PAYPAL_ERROR', e.message)
  }
})

app.post('/api/negotiations/:id/capture', negotiationRoute, async (req, res) => {
  const n = req.neg
  if (req.side !== 'buyer') return fail(res, 403, 'FORBIDDEN', 'Only the buyer pays')
  if (n.paid) return res.json(view(n, 'buyer'))                 // safe to call twice
  if (!n.orderId || n.orderId !== req.body.orderId) return fail(res, 400, 'VALIDATION', 'Unknown orderId')
  try {
    const result = await captureOrder(n.orderId)
    if (result.status !== 'COMPLETED') return fail(res, 402, 'PAYPAL_ERROR', `Payment ${result.status}`)
    n.paid = true
    audit(n, 'payment_completed', { orderId: n.orderId })
    res.json(view(n, 'buyer'))
  } catch (e) {
    fail(res, 502, 'PAYPAL_ERROR', e.message)
  }
})

// Demo helper: puts everything back to the starting data
app.post('/api/demo/reset', (req, res) => { seed(); res.json({ ok: true }) })

// ---------- Errors ----------
app.use('/api', (req, res) => fail(res, 404, 'NOT_FOUND', 'Unknown route'))
app.use((err, req, res, next) => {
  console.error(err)
  const bad = err.type === 'entity.parse.failed'
  fail(res, bad ? 400 : 500, bad ? 'VALIDATION' : 'SERVER_ERROR', bad ? 'Invalid JSON' : 'Something went wrong')
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))