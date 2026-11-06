import type { ReactNode } from 'react'
import { discountOf, groupOf } from '../lib/sales'
import type { SellerSale } from '../types/dashboard'

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

/** The four headline numbers of the history, computed the same way the table's totals row is. */
export function kpisOf(sales: SellerSale[]) {
  const paid = sales.filter((s) => s.outcome === 'paid' && s.agreedPrice != null)
  const revenue = paid.reduce((sum, s) => sum + (s.agreedPrice ?? 0), 0)
  const list = paid.reduce((sum, s) => sum + s.listPrice, 0)
  const pending = sales
    .filter((s) => groupOf(s.outcome) === 'progress' && s.agreedPrice != null)
    .reduce((sum, s) => sum + (s.agreedPrice ?? 0), 0)
  const decided = sales.filter((s) => groupOf(s.outcome) !== 'progress').length
  const discounts = paid.map((s) => discountOf(s) ?? 0)
  return {
    revenue,
    pending,
    sales: paid.length,
    winRate: decided ? paid.length / decided : null,
    average: paid.length ? revenue / paid.length : 0,
    avgDiscount: discounts.length ? discounts.reduce((a, b) => a + b, 0) / discounts.length : 0,
    kept: list > 0 ? revenue / list : null,
  }
}

type Tone = 'navy' | 'green' | 'blue' | 'amber'

function Card({ tone, icon, label, value, note }: { tone: Tone; icon: ReactNode; label: string; value: string; note: ReactNode }) {
  return (
    <div className={`kpi kpi--${tone}`}>
      <span className="kpi-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      <span className="kpi-note">{note}</span>
    </div>
  )
}

const svg = (d: string) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

/** Four summary cards above the ledger. They follow the period filter, so they always match the charts. */
export default function SalesKpis({ sales }: { sales: SellerSale[] }) {
  const k = kpisOf(sales)
  return (
    <section className="kpi-row" aria-label="Summary">
      <Card
        tone="navy"
        icon={svg('M12 2v20M17 6.5C17 4.6 14.8 3.5 12 3.5S7 4.9 7 7c0 4.7 10 2.3 10 7 0 2.1-2.2 3.5-5 3.5s-5-1.1-5-3')}
        label="Revenue earned"
        value={money(k.revenue)}
        note={k.pending > 0 ? <><strong>{money(k.pending)}</strong> still on its way</> : 'Paid deals only'}
      />
      <Card
        tone="green"
        icon={svg('M20 6 9 17l-5-5')}
        label="Sales completed"
        value={String(k.sales)}
        note={k.winRate == null ? 'No finished deals yet' : <><strong>{Math.round(k.winRate * 100)}%</strong> of finished deals sold</>}
      />
      <Card
        tone="blue"
        icon={svg('M3 17l6-6 4 4 8-8M15 7h6v6')}
        label="Average sale"
        value={money(k.average)}
        note={k.kept == null ? 'Nothing sold yet' : <>You kept <strong>{Math.round(k.kept * 100)}%</strong> of list price</>}
      />
      <Card
        tone="amber"
        icon={svg('M19 5 5 19M7.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm9 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z')}
        label="Average discount"
        value={`${(k.avgDiscount * 100).toFixed(1)}%`}
        note="Given up to close a sale"
      />
    </section>
  )
}
