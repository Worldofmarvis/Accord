import express from 'express'

const app = express()
app.use(express.json())

// Allow the frontend (Vite, port 5173) to call this server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-User-Id')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// ---------- Temporary fake data (swap for the database functions later) ----------
const demoUsers = [
  { id: 1, name: 'Maya Santos', role: 'seller' },
  { id: 2, name: 'Daniel Reyes', role: 'seller' },
  { id: 3, name: 'Alex Kim', role: 'buyer' },
  { id: 4, name: 'Priya Shah', role: 'buyer' },
]

const listings = [
  { id: 1, sellerId: 1, title: '5-page business website', category: 'Web development',
    description: 'Responsive site with contact form, simple CMS setup and launch support.',
    listPrice: 500, deliveryDays: 7, locked: false },
  { id: 2, sellerId: 2, title: 'Portfolio website for creatives', category: 'Web development',
    description: 'Gallery layout, about page and contact form, built to be easy to update.',
    listPrice: 450, deliveryDays: 10, locked: true },
]

// ---------- Demo-only auth: the frontend sends X-User-Id ----------
function currentUser(req, res, next) {
  const user = demoUsers.find(u => u.id === Number(req.headers['x-user-id']))
  if (!user) return res.status(401).json({ error: 'Missing or unknown X-User-Id header' })
  req.user = user
  next()
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) return res.status(403).json({ error: `Only a ${role} can do this` })
    next()
  }
}

const withSeller = l => ({ ...l, sellerName: demoUsers.find(u => u.id === l.sellerId)?.name })

// ---------- Routes ----------
app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.get('/users/demo', (req, res) => {
  const { role } = req.query
  res.json(role ? demoUsers.filter(u => u.role === role) : demoUsers)
})

app.get('/listings/search', (req, res) => {
  const { keyword = '', category = '', maxPrice, sort = 'best_match' } = req.query
  const k = keyword.toLowerCase()

  let results = listings.filter(l =>
    (!k || l.title.toLowerCase().includes(k) || l.description.toLowerCase().includes(k)) &&
    (!category || l.category === category) &&
    (maxPrice === undefined || maxPrice === '' || l.listPrice <= Number(maxPrice))
  )

  if (sort === 'price_asc') results.sort((a, b) => a.listPrice - b.listPrice)
  if (sort === 'price_desc') results.sort((a, b) => b.listPrice - a.listPrice)

  res.json({ total: results.length, results: results.map(withSeller) })
})

app.get('/listings/:id', (req, res) => {
  const listing = listings.find(l => l.id === Number(req.params.id))
  if (!listing) return res.status(404).json({ error: 'Listing not found' })
  res.json(withSeller(listing))
})

app.post('/listings', currentUser, requireRole('seller'), (req, res) => {
  const { title, category, description, listPrice, deliveryDays } = req.body
  if (!title || !category || !(listPrice > 0)) {
    return res.status(400).json({ error: 'title, category and a positive listPrice are required' })
  }
  const listing = {
    id: listings.length + 1, sellerId: req.user.id, title, category,
    description: description || '', listPrice, deliveryDays: deliveryDays || 7, locked: false,
  }
  listings.push(listing)
  res.status(201).json(withSeller(listing))
})

app.get('/me', currentUser, (req, res) => res.json(req.user))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))