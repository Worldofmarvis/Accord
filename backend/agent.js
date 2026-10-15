export function contextFor(n, role) {
  return {
    role,
    service: n.service,
    round: n.round,
    maxRounds: n.maxRounds,
    listPrice: n.listPrice,
    limits: role === 'buyer'
      ? { target: n.limits.buyerTarget, max: n.limits.buyerMax }
      : { floor: n.limits.sellerFloor },
    history: n.offers.map(o => ({ round: o.round, role: o.role, amount: o.amount })),
  }
}
 
export function ruleBased(ctx) {
  const last = ctx.round === ctx.maxRounds
  if (ctx.role === 'buyer') {
    const { target, max } = ctx.limits
    const step = (ctx.round - 1) / (ctx.maxRounds - 1)
    return {
      price: Math.round(target + (max - target) * step),
      note: ctx.round === 1 ? 'Opening below the list price.' : last ? 'Best offer.' : 'Moving up a little.',
    }
  }
  const { floor } = ctx.limits
  return {
    price: Math.round(ctx.listPrice - ((ctx.listPrice - floor) * ctx.round) / ctx.maxRounds),
    note: ctx.round === 1 ? 'Starting near the list price.' : last ? 'Best offer.' : 'Meeting you partway.',
  }
}
 
// ---------- The AI agent service (the Python app: agents/app.py) ----------
// .env settings (all optional):
//   AGENT_URL         where the Python service runs, for example http://localhost:8000.
//                     Leave it empty and the rule-based agent above is used.
//   AGENT_USE_LLM     "true" lets Gemini word the note (needs the key in the Python service). Default: false.
//   AGENT_TIMEOUT_MS  how long to wait for the service before using the rule-based agent. Default: 4000.
 
// The seller's "target price" is not stored anywhere, so we pick one between the floor and the list price.
// 0 = the seller works down to its floor, 1 = the seller stays at the list price.
const SELLER_TARGET_SHARE = 0
 
// What we send. Each agent only gets its OWN limits. The other side's limits never leave this server.
function payloadFor(n, role) {
  const scope = [n.service]
  const own = role === 'buyer'
    ? { target_price: n.limits.buyerTarget, reservation_price: n.limits.buyerMax }
    : {
        target_price: Math.round(n.limits.sellerFloor + SELLER_TARGET_SHARE * (n.listPrice - n.limits.sellerFloor)),
        reservation_price: n.limits.sellerFloor,
      }
  return {
    role,
    limits: { list_price: n.listPrice, ...own, max_rounds: n.maxRounds },
    scope: { required: scope, optional: [] },
    history: n.offers.map(o => ({ by: o.role, action: 'offer', price: o.amount, scope })),
    use_llm: process.env.AGENT_USE_LLM === 'true',
  }
}
 
// The note is shown to BOTH sides, so it must never contain this agent's own private numbers.
function safeNote(n, role, note, price) {
  const secrets = role === 'buyer' ? [n.limits.buyerTarget, n.limits.buyerMax] : [n.limits.sellerFloor]
  const leaks = (String(note ?? '').match(/\d[\d,]*(?:\.\d+)?/g) ?? [])
    .map(x => Number(x.replace(/,/g, '')))
    .some(x => secrets.includes(x) && Math.round(x) !== Math.round(price))
  return leaks ? '' : String(note ?? '').trim()
}
 
// His service answers with an action (offer / accept / reject). The engine only knows offers, so:
//   offer  -> that price
//   accept -> the price he accepts; the engine sees it matches and closes the deal
//   reject -> repeat our own last offer; the engine ends the session when the rounds run out
function toOffer(n, role, out) {
  let price = Number(out?.price)
  if (out?.action === 'reject') {
    const own = [...n.offers].reverse().find(o => o.role === role)
    price = own ? own.amount : ruleBased(contextFor(n, role)).price
  }
  if (!Number.isFinite(price)) throw new Error('agent service sent no price')
  return { price, note: safeNote(n, role, out.reason, price) }
}
 
// If this throws (service down, too slow, bad answer), server.js falls back to ruleBased, so the demo never breaks.
export async function proposeOffer(n, role) {
  const url = process.env.AGENT_URL
  if (!url) return ruleBased(contextFor(n, role))
 
  const res = await fetch(`${url.replace(/\/$/, '')}/api/negotiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payloadFor(n, role)),
    signal: AbortSignal.timeout(Number(process.env.AGENT_TIMEOUT_MS ?? 4000)),
  })
  if (!res.ok) throw new Error(`agent service answered ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return toOffer(n, role, await res.json())
}
