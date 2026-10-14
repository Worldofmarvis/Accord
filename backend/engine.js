export const MAX_ROUNDS = 3

export const audit = (n, event, data = {}) =>
  n.audit.push({ event, data, at: new Date().toISOString() })

const lastOffer = (n, role) => [...n.offers].reverse().find(o => o.role === role)

function close(n, status, price = null) {
  n.status = status
  n.waitingOn = null
  n.agreedPrice = price
  n.closedAt = Date.now()
  audit(n, status, { price })
  return { ok: true }
}

// The only place a price is accepted. Agents propose, this function decides.
export function applyOffer(n, role, proposed, note = '') {
  if (n.status !== 'active') return { error: 'The negotiation is closed' }
  if (n.waitingOn !== role) return { error: `It is the ${n.waitingOn}'s turn` }

  const min = role === 'buyer' ? 1 : n.limits.sellerFloor
  const max = role === 'buyer' ? n.limits.buyerMax : n.listPrice
  const wanted = Math.round(proposed)
  const amount = Math.min(max, Math.max(min, wanted))

  const offer = { round: n.round, role, amount, note }
  if (amount !== wanted) {
    offer.blocked = {
      proposed: wanted,
      reason: wanted > max
        ? (role === 'buyer' ? `above your maximum of $${max}` : `above the listed price of $${max}`)
        : (role === 'buyer' ? 'below the minimum allowed' : "below the seller's minimum"),
    }
  }
  n.offers.push(offer)
  audit(n, offer.blocked ? 'offer_clipped' : 'offer_accepted', { role, round: n.round, wanted, amount })

  if (role === 'buyer') {
    const ask = lastOffer(n, 'seller')?.amount ?? n.listPrice
    if (amount >= ask) return close(n, 'agreed', ask)
    n.waitingOn = 'seller'
  } else {
    const bid = lastOffer(n, 'buyer').amount
    if (amount <= bid) return close(n, 'agreed', bid)
    if (n.round >= n.maxRounds) return close(n, 'no_agreement')
    n.round += 1
    n.waitingOn = 'buyer'
  }
  return { ok: true }
}