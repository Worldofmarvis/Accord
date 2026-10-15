import type { SaleOutcome, SellerSale } from '../types/dashboard'

// Helpers for the seller's sales history. Plain functions, so the dashboard and the simple table agree.

export const outcomeLabel: Record<SaleOutcome, string> = {
  paid: 'Paid',
  awaiting_payment: 'Awaiting payment',
  awaiting_approval: 'Awaiting approval',
  declined: 'Declined',
  no_agreement: 'No agreement',
}

/** The groups the filter buttons use: money in, still moving, and lost. */
export type SaleGroup = 'all' | 'sold' | 'progress' | 'lost'

export const groupLabel: Record<SaleGroup, string> = {
  all: 'All deals',
  sold: 'Sold',
  progress: 'In progress',
  lost: 'Lost',
}

export function groupOf(outcome: SaleOutcome): Exclude<SaleGroup, 'all'> {
  if (outcome === 'paid') return 'sold'
  if (outcome === 'awaiting_approval' || outcome === 'awaiting_payment') return 'progress'
  return 'lost'
}

/** A deal that can still change (the history refreshes while one is open). */
export const isOpen = (sale: SellerSale) => groupOf(sale.outcome) === 'progress'

export type SalePeriod = 'all' | '90d' | 'year'

export const periodLabel: Record<SalePeriod, string> = {
  all: 'All time',
  '90d': 'Last 90 days',
  year: 'This year',
}

export function inPeriod(sale: SellerSale, period: SalePeriod, now: Date = new Date()): boolean {
  if (period === 'all') return true
  if (period === 'year') return new Date(sale.date).getFullYear() === now.getFullYear()
  return new Date(sale.date).getTime() >= now.getTime() - 90 * 24 * 60 * 60 * 1000
}

/** How far the agreed price is under the list price, as a fraction (0.12 is 12%). Null when nothing was agreed. */
export function discountOf(sale: SellerSale): number | null {
  if (sale.agreedPrice == null || sale.listPrice <= 0) return null
  return (sale.listPrice - sale.agreedPrice) / sale.listPrice
}

/** How many dollars the agreed price is above the seller's own floor. Null when nothing was agreed. */
export function aboveFloorOf(sale: SellerSale): number | null {
  return sale.agreedPrice == null ? null : sale.agreedPrice - sale.priceFloor
}

/** "Oct 14, 2026" in the viewer's calendar. Empty if the date can't be read. */
export function saleDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** "YYYY-MM-DD" and "YYYY-MM" in the viewer's calendar, for the grid and the monthly chart. */
function dayAndMonth(iso: string): { day: string; month: string } {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return { day: iso.slice(0, 10), month: iso.slice(0, 7) }
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return { day: `${date.getFullYear()}-${month}-${day}`, month: `${date.getFullYear()}-${month}` }
}

/**
 * The rows AG Studio reads. Money that was really earned lives in its own fields (`revenue`, `sold`,
 * `soldDiscount`), empty for deals that did not end in a payment. Studio leaves empty values out of
 * sums and averages, so the totals count only paid sales without any filter setup.
 */
export function toStudioRows(sales: SellerSale[]) {
  return sales.map((s) => {
    const paid = s.outcome === 'paid'
    const discount = discountOf(s)
    const { day, month } = dayAndMonth(s.date)
    return {
      date: day,
      month,
      buyer: s.buyerName,
      service: s.service,
      listPrice: s.listPrice,
      finalPrice: s.agreedPrice,
      discount,
      aboveFloor: aboveFloorOf(s),
      rounds: s.rounds,
      status: outcomeLabel[s.outcome],
      deals: 1,
      revenue: paid ? s.agreedPrice : null,
      sold: paid ? 1 : null,
      soldDiscount: paid ? discount : null,
    }
  })
}

/** Totals for the simple table's footer, counted the same way as the dashboard tiles. */
export function summarize(sales: SellerSale[]) {
  const paid = sales.filter((s) => s.outcome === 'paid' && s.agreedPrice != null)
  const revenue = paid.reduce((sum, s) => sum + (s.agreedPrice ?? 0), 0)
  return { sales: paid.length, revenue, average: paid.length ? Math.round(revenue / paid.length) : 0 }
}
