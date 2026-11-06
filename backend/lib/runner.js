import { applyOffer } from '../engine.js'
import { proposeOffer, contextFor, ruleBased } from '../agent.js'
import { loadNeg, saveNeg } from './negotiation.js'

// The agents take turns, one offer every STEP_MS, so the screen can show it live.
export function scheduleStep(id) {
  const stepMs = Number(process.env.STEP_MS ?? 2500)
  setTimeout(() => step(id).catch(console.error), stepMs)
}

async function step(id) {
  const n = await loadNeg(id)
  if (!n || n.status !== 'active') return
  const known = n.offers.length
  const role = n.waitingOn
  let proposal = null
  try { proposal = await proposeOffer(n, role) } catch (e) { console.error('agent failed:', e.message) }
  if (!Number.isFinite(proposal?.price)) proposal = ruleBased(contextFor(n, role))
  applyOffer(n, role, proposal.price, proposal.note)
  await saveNeg(n, known)
  if (n.status === 'active') scheduleStep(id)
}
