const API = 'http://localhost:3000/api'

async function call(method, path, body, user) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(user ? { 'X-User-Id': user } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, data: await res.json().catch(() => null) }
}
const show = (label, r) => console.log(label.padEnd(38), r.status, JSON.stringify(r.data).slice(0, 100))

await call('POST', '/demo/reset')
show('search "website"', await call('GET', '/listings?keyword=website'))

const started = await call('POST', '/negotiations', { listingId: 'l1', requestId: 'r1' })
show('buyer u3 starts a negotiation', started)
show('buyer u4, same seller (want 409)', await call('POST', '/negotiations', { listingId: 'l1', requestId: 'r2' }, 'u4'))
show('buyer u3, locked seller (want 409)', await call('POST', '/negotiations', { listingId: 'l2', requestId: 'r1' }))

const id = started.data.id
show('chat message', await call('POST', `/negotiations/${id}/messages`, { text: 'Can you add a blog page?' }))
show('chat with a price (gets a warning)', await call('POST', `/negotiations/${id}/messages`, { text: 'Just take $100' }))

let n
for (let i = 0; i < 40; i++) {
  n = (await call('GET', `/negotiations/${id}`)).data
  if (n.status !== 'active') break
  await new Promise(r => setTimeout(r, 1000))
}
show('final state', { status: 200, data: { status: n.status, agreedPrice: n.agreedPrice, offers: n.offers.length } })
console.log('seller floor visible to buyer?'.padEnd(38), JSON.stringify(n).includes('priceFloor'))
if (n.status === 'agreed') show('create PayPal order', await call('POST', `/negotiations/${id}/pay`))