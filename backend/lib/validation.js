import { text } from './http.js'

export function parseListing(b, base = {}) {
  const v = {
    title: String(b.title ?? base.title ?? '').trim(),
    category: String(b.category ?? base.category ?? '').trim(),
    deliverables: text(b.deliverables ?? base.deliverables),
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

export function parseRequest(b) {
  const v = {
    title: String(b.title ?? '').trim(),
    category: String(b.category ?? '').trim(),
    deliverables: text(b.deliverables),
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
