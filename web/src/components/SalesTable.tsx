import { usd } from '../lib/format'
import { aboveFloorOf, discountOf, groupOf, outcomeLabel, saleDate, summarize } from '../lib/sales'
import type { SellerSale } from '../types/dashboard'
import Badge from './Badge'

const tone = { sold: 'success', progress: 'info', lost: 'neutral' } as const

const percent = (n: number | null) => (n == null ? '–' : `${(n * 100).toFixed(1)}%`)
const money = (n: number | null) => (n == null ? '–' : usd(n))

/**
 * The same deals as a plain table. It is the fallback if the dashboard cannot load, and a simple,
 * screen-reader-friendly way to read the history.
 */
export default function SalesTable({ sales }: { sales: SellerSale[] }) {
  const totals = summarize(sales)
  return (
    <div className="sales-table-wrap">
      <table className="sales-table">
        <caption className="sr-only">Sales history, newest first</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Buyer</th>
            <th scope="col">Service</th>
            <th scope="col" className="num">List price</th>
            <th scope="col" className="num">Final price</th>
            <th scope="col" className="num">Discount</th>
            <th scope="col" className="num">Above floor</th>
            <th scope="col" className="num">Rounds</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((s) => (
            <tr key={s.id}>
              <td>{saleDate(s.date)}</td>
              <td>{s.buyerName}</td>
              <td>{s.service}</td>
              <td className="num">{usd(s.listPrice)}</td>
              <td className="num">{money(s.agreedPrice)}</td>
              <td className="num">{percent(discountOf(s))}</td>
              <td className="num">{money(aboveFloorOf(s))}</td>
              <td className="num">{s.rounds}</td>
              <td>
                <Badge tone={tone[groupOf(s.outcome)]}>{outcomeLabel[s.outcome]}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={4}>
              {totals.sales} {totals.sales === 1 ? 'sale' : 'sales'} completed
            </th>
            <td className="num" colSpan={5}>
              {usd(totals.revenue)} earned{totals.sales ? `, ${usd(totals.average)} on average` : ''}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
