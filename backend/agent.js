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

// AI/ML teammate: call the real agent service here.
// If it fails or is too slow, return ruleBased(ctx) so the demo never breaks.
export async function proposeOffer(n, role) {
  return ruleBased(contextFor(n, role))
}