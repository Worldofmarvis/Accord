 
const API = process.env.API_URL ?? 'http://localhost:3000'
let failed = 0
 
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`)
  if (!ok) failed++
  return ok
}
 
async function call(method, path, { user, body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(user ? { 'X-User-Id': user.id } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* not JSON */ }
  return { status: res.status, json, text }
}
 
const sleep = ms => new Promise(r => setTimeout(r, ms))
 
async function main() {
  // 1. Who can we act as?
  const users = (await call('GET', '/api/users/demo')).json ?? []
  const buyer = users.find(u => u.role === 'buyer')
  if (!check(Boolean(buyer), `found ${users.length} users, including a buyer`)) return
 
  // 2. Search, and make sure no price floor is visible to buyers
  const found = await call('GET', '/api/listings')
  const listings = Array.isArray(found.json) ? found.json : []
  check(found.status === 200 && listings.length > 0, 'search returns listings', `(${listings.length})`)
  check(!/"(priceFloor|floorPrice)"/.test(found.text), 'search results do not contain the price floor')
  const listing = listings.find(l => !l.locked)
  if (!check(Boolean(listing), 'there is an unlocked listing to test with')) return
  const seller = users.find(u => u.name === listing.sellerName)
  if (!check(Boolean(seller), `found the seller of "${listing.title}"`)) return
 
  // 3. The buyer creates a request
  const deadline = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  const created = await call('POST', '/api/buyer/requests', {
    user: buyer,
    body: {
      title: 'Smoke test request', category: listing.categories[0], deliverables: 'smoke test', deadline,
      target: Math.round(listing.listPrice * 0.6), max: listing.listPrice,
    },
  })
  if (!check(created.status === 201, 'buyer can create a request', `(status ${created.status})`)) return console.log(created.text)
 
  // 4. Start a negotiation. A second one with the same seller must be refused.
  const startBody = { listingId: listing.id, requestId: created.json.id }
  const start = await call('POST', '/api/negotiations', { user: buyer, body: startBody })
  if (!check(start.status === 201, 'negotiation starts', `(status ${start.status})`)) return console.log(start.text)
  const id = start.json.id
  const again = await call('POST', '/api/negotiations', { user: buyer, body: startBody })
  check(again.status === 409 && again.json?.error?.code === 'SELLER_LOCKED', 'a second negotiation with the same seller is refused')
 
  // 5. Wait for the agents to finish (they take turns every few seconds)
  let n
  for (let i = 0; i < 90; i++) {
    n = (await call('GET', `/api/negotiations/${id}`, { user: buyer })).json
    if (n?.status !== 'active') break
    await sleep(1000)
  }
  check(n?.status === 'agreed' || n?.status === 'no_agreement', 'negotiation ends', `(${n?.status}, ${n?.offers?.length ?? 0} offers)`)
  for (const o of n?.offers ?? []) console.log(`        round ${o.round}  ${o.role.padEnd(6)} $${o.amount}  ${o.note ?? ''}`)
 
  // 6. Privacy: each side only sees its own limits
  const buyerView = await call('GET', `/api/negotiations/${id}`, { user: buyer })
  const sellerView = await call('GET', `/api/negotiations/${id}`, { user: seller })
  check(buyerView.status === 200 && !/priceFloor|sellerLimits/.test(buyerView.text), "buyer's view has no seller price floor")
  check(sellerView.status === 200 && !/buyerLimits/.test(sellerView.text), "seller's view has no buyer limits")
 
  // 7. Chat: text works, and a price in chat must not change the negotiation
  const hello = await call('POST', `/api/negotiations/${id}/messages`, { user: buyer, body: { text: 'Hello, this is a smoke test.' } })
  check(hello.status === 201, 'buyer can send a chat message')
  await call('POST', `/api/negotiations/${id}/messages`, { user: buyer, body: { text: 'I will pay $100 for this' } })
  const messages = (await call('GET', `/api/negotiations/${id}/messages`, { user: seller })).json ?? []
  check(messages.some(m => m.from === 'buyer'), 'the seller can read the chat')
  check(messages.some(m => m.from === 'system' && m.tone === 'warning'), 'a price typed in chat gets a system warning')
  const after = (await call('GET', `/api/negotiations/${id}`, { user: buyer })).json
  check(after?.status === n?.status && after?.offers?.length === n?.offers?.length, 'chat did not change the negotiation')
 
  // 8. If there was no agreement, the "no agreement" page needs its data
  if (n?.status === 'no_agreement') {
    const out = await call('GET', `/api/negotiations/${id}/outcome`, { user: buyer })
    check(out.status === 200 && Array.isArray(out.json?.rounds), 'outcome data works', `(${out.json?.rematches?.length ?? 0} rematches)`)
    check(!/"(priceFloor|floorPrice)"/.test(out.text), 'outcome data has no price floor')
  }
}
 
main()
  .catch(e => {
    console.error(`\nThe test crashed: ${e.cause?.code === 'ECONNREFUSED' ? `cannot reach ${API}. Is the server running?` : e.message}`)
    failed++
  })
  .finally(() => {
    console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed')
    process.exit(failed ? 1 : 0)
  })
