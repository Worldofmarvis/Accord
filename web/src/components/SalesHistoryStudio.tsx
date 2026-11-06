import { useMemo, type ReactNode } from 'react'
import type { AgPanelConfig } from 'ag-studio'
import { AgStudio, AgStudioProvider } from 'ag-studio-react'
import { chartStudioTheme, STUDIO_LICENSE } from '../lib/studioTheme'
import { toStudioRows } from '../lib/sales'
import type { SellerSale } from '../types/dashboard'

// Loaded on demand by SalesHistory, so AG Studio is only downloaded when a seller opens their history.

import { outcomeLabel } from '../lib/sales'
import { useNarrow } from '../hooks/useNarrow'

const SOURCE = 'sales'
const STATUS_ORDER = [outcomeLabel.paid, outcomeLabel.awaiting_payment, outcomeLabel.awaiting_approval, outcomeLabel.declined, outcomeLabel.no_agreement]
const col = (field: string) => `${SOURCE}.${field}`

// The fields Studio shows: friendly names, and a format for each, from the AG Studio "Formatting" docs.
// Dates are ISO strings (`dateFormat` reads those). Money is whole dollars.
const MONEY = { format: '$#,##0' }
const FIELDS = [
  { id: 'date', name: 'Date', format: 'dateFormat', formatOptions: { format: 'dd mmm yyyy' } },
  { id: 'month', name: 'Month', format: 'dateFormat', formatOptions: { format: 'mmm yyyy' } },
  { id: 'buyer', name: 'Buyer', format: 'textFormat' },
  { id: 'service', name: 'Service', format: 'textFormat' },
  { id: 'listPrice', name: 'List price', format: 'currencyFormat', formatOptions: MONEY },
  { id: 'finalPrice', name: 'Final price', format: 'currencyFormat', formatOptions: MONEY },
  { id: 'discount', name: 'Discount', format: 'percentageFormat', formatOptions: { format: '0.0%' } },
  { id: 'aboveFloor', name: 'Above floor', format: 'currencyFormat', formatOptions: MONEY },
  { id: 'rounds', name: 'Rounds', format: 'integerFormat' },
  { id: 'status', name: 'Status', format: 'textFormat' },
  { id: 'deals', name: 'Deals', format: 'integerFormat' },
  { id: 'revenue', name: 'Revenue', format: 'currencyFormat', formatOptions: MONEY },
  { id: 'sold', name: 'Sales', format: 'integerFormat' },
  { id: 'soldDiscount', name: 'Discount on sales', format: 'percentageFormat', formatOptions: { format: '0.0%' } },
]

// Layout, from the "Modes & Layout" docs: the page is a grid of 24 columns and rows 16px tall. With a fixed
// height of (rows x row height) plus double the page padding, there is no stray space at the bottom.
const ROW_HEIGHT = 16
const PAGE_PADDING = 0
const CHART_ROWS = 20
const heightOf = (narrow: boolean) => (narrow ? 2 : 1) * CHART_ROWS * ROW_HEIGHT + 2 * PAGE_PADDING

// The edit panels are for building reports and the Filters panel would only repeat the filter buttons
// above the dashboard, so view mode shows the page alone. (Clicking a bar or a slice still filters.)
const PANELS: AgPanelConfig = { view: { left: [], right: [] } }

const buildState = (narrow: boolean) => ({
  pages: [
    {
      id: 'sales-history',
      widgets: {
        'revenue-by-month': {
          type: 'column-chart-grouped',
          dataMapping: {
            categoryKey: [{ id: col('month') }],
            valueKey: [{ id: col('revenue'), aggregation: 'sum' }],
          },
          sort: [{ field: { id: col('month') }, direction: 'asc' }],
          format: { title: { enabled: true, text: 'Revenue by month' } },
        },
        'outcomes': {
          type: 'donut-chart',
          dataMapping: {
            categoryKey: [{ id: col('status') }],
            valueKey: [{ id: col('deals'), aggregation: 'sum' }],
          },
          format: {
            title: { enabled: true, text: 'How deals ended' },
            style: { theme: { common: { legend: { enabled: true, position: 'right' } } } },
          },
        },
      },
      widgetLayout: {
        // Side by side, or one above the other on a phone.
        'revenue-by-month': { xTrack: 0, yTrack: 0, xSpan: narrow ? 24 : 14, ySpan: CHART_ROWS },
        outcomes: narrow
          ? { xTrack: 0, yTrack: CHART_ROWS, xSpan: 24, ySpan: CHART_ROWS }
          : { xTrack: 14, yTrack: 0, xSpan: 10, ySpan: CHART_ROWS },
      },
    },
  ],
  selectedPageId: 'sales-history',
})

/**
 * The chart strip of the sales history, an AG Studio dashboard: revenue by month and how deals ended.
 * (The totals are cards and the ledger is an AG Grid, both in their own components.)
 * It only shows the seller's own deals and their own price floor.
 */
export default function SalesHistoryStudio({ sales }: { sales: SellerSale[] }) {
  // Studio gives categories their colours in the order it first meets them, so list the deals by outcome:
  // paid first. That keeps "Paid" green and "Declined" red, the same colours as the ledger's status pills.
  const rowsJson = JSON.stringify(
    toStudioRows(sales)
      .map((row, i) => ({ row, i, rank: STATUS_ORDER.indexOf(row.status) }))
      .sort((a, b) => a.rank - b.rank || a.i - b.i)
      .map((x) => x.row),
  )

  // Stable objects: Studio reads them again only when the deals really change.
  const data = useMemo(() => ({ sources: [{ id: SOURCE, name: 'Sales', data: JSON.parse(rowsJson), fields: FIELDS }] }), [rowsJson])
  const narrow = useNarrow()
  const height = heightOf(narrow)
  const layout = useMemo(() => ({ minWidth: 240, rowHeight: ROW_HEIGHT, pagePadding: PAGE_PADDING, height }), [height])
  // Studio reads `initialState` once, so the two layouts are two separate starts (see `key` below).
  const initialState = useMemo(() => buildState(narrow), [narrow])

  // The state object follows the AG Studio docs; it is typed loosely here so the compiler does not reject a
  // valid shape. If Studio reports it as invalid, re-create it in edit mode and copy it with getState().
  const studio: ReactNode = (
    <AgStudio
      key={narrow ? 'stacked' : 'side-by-side'}
      style={{ width: '100%', height: '100%' }}
      data={data as never}
      initialState={initialState as never}
      mode="view"
      panels={PANELS}
      layout={layout}
      theme={chartStudioTheme as never}
    />
  )
  return (
    <div className="sales-studio" style={{ height }}>
      {STUDIO_LICENSE ? <AgStudioProvider licenseKey={STUDIO_LICENSE}>{studio}</AgStudioProvider> : studio}
    </div>
  )
}
