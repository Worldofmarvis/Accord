import express from 'express'
import rateLimit from 'express-rate-limit'
import { fail } from './lib/http.js'
import publicRoutes from './routes/public.js'
import buyerRoutes from './routes/buyer.js'
import sellerRoutes from './routes/seller.js'
import negotiationRoutes from './routes/negotiations.js'
import paymentRoutes from './routes/payments.js'
import approvalRoutes from './routes/approval.js'
import proposalRoutes from './routes/proposals.js'

const app = express()
app.set('trust proxy', 1)   // behind Render's proxy, so limits count each visitor's own address
app.use(express.json())
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-User-Id')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// ---------- Logging ----------
// One line per request: time, method, path, status and duration.
// Never logs headers or bodies, so user ids and keys stay out of the log.
// Successful GETs are skipped: the screens poll every 3 seconds and would bury the real events.
app.use((req, res, next) => {
  const start = Date.now()
  const path = req.originalUrl.split('?')[0]   // the full path, without the query string, so keywords never reach the log
  res.on('finish', () => {
    if (req.method === 'GET' && res.statusCode < 400) return
    console.log(`${new Date().toISOString()} ${req.method} ${path} ${res.statusCode} ${Date.now() - start}ms`)
  })
  next()
})

app.get(['/health', '/api/health'], (req, res) => res.json({ status: 'ok' }))

// ---------- Rate limits ----------
// Errors use the same shape as the rest of the API, so the front end shows the message.
const limit = (max, message) => rateLimit({
  windowMs: 60_000,
  limit: max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => fail(res, 429, 'RATE_LIMITED', message),
})

// Generous: normal polling from several tabs must never hit it. It only stops a runaway loop.
app.use('/api', limit(1200, 'Too many requests. Please wait a minute and try again.'))
// Tighter on the actions that cost something.
app.post('/api/negotiations/:id/messages', limit(30, 'You are sending messages too fast. Please wait a moment.'))
app.post('/api/negotiations', limit(20, 'Too many attempts. Please wait a minute and try again.'))
app.post(
  ['/api/negotiations/:id/payment/order', '/api/negotiations/:id/payment/capture'],
  limit(20, 'Too many payment attempts. Please wait a minute and try again.'),
)

// All the API routes live in routes/. Each file has one job.
app.use('/api', publicRoutes)        // demo users, search
app.use('/api', buyerRoutes)         // buyer dashboard
app.use('/api', sellerRoutes)        // seller dashboard
app.use('/api', negotiationRoutes)   // start, live view, outcome, chat
app.use('/api', paymentRoutes)       // PayPal
app.use('/api', approvalRoutes)      // approval
app.use('/api', proposalRoutes)       // proposals
// ---------- Errors ----------
app.use('/api', (req, res) => fail(res, 404, 'NOT_FOUND', 'Unknown route'))
app.use((err, req, res, next) => {
  console.error(err)
  const bad = err.type === 'entity.parse.failed'
  fail(res, bad ? 400 : 500, bad ? 'VALIDATION' : 'SERVER_ERROR', bad ? 'Invalid JSON' : 'Something went wrong')
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))