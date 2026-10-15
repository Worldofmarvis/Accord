import express from 'express'
import { fail } from './lib/http.js'
import publicRoutes from './routes/public.js'
import buyerRoutes from './routes/buyer.js'
import sellerRoutes from './routes/seller.js'
import negotiationRoutes from './routes/negotiations.js'
import paymentRoutes from './routes/payments.js'

const app = express()
app.use(express.json())
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-User-Id')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.get(['/health', '/api/health'], (req, res) => res.json({ status: 'ok' }))

// All the API routes live in routes/. Each file has one job.
app.use('/api', publicRoutes)        // demo users, search
app.use('/api', buyerRoutes)         // buyer dashboard
app.use('/api', sellerRoutes)        // seller dashboard
app.use('/api', negotiationRoutes)   // start, live view, outcome, chat
app.use('/api', paymentRoutes)       // PayPal

// ---------- Errors ----------
app.use('/api', (req, res) => fail(res, 404, 'NOT_FOUND', 'Unknown route'))
app.use((err, req, res, next) => {
  console.error(err)
  const bad = err.type === 'entity.parse.failed'
  fail(res, bad ? 400 : 500, bad ? 'VALIDATION' : 'SERVER_ERROR', bad ? 'Invalid JSON' : 'Something went wrong')
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
