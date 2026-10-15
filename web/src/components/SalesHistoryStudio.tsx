import { useMemo, type ReactNode } from 'react'
import type { AgPanelConfig } from 'ag-studio'
import { AgStudio, AgStudioProvider } from 'ag-studio-react'
import { appStudioTheme, STUDIO_LICENSE } from '../lib/studioTheme'
import { toStudioRows } from '../lib/sales'
import type { SellerSale } from '../types/dashboard'

// Loaded on demand by SalesHistory, so AG Studio is only downloaded when a seller opens their history.

const SOURCE = 'sales'
const col = (field: string) => `${SOURCE}.${field}`

// The fields Studio shows: friendly names, and a format for each, from the AG Studio "Formatting" docs.
// Dates are ISO strings (`dateFormat` reads those). Money is whole dollars.
const MONEY = { format: '$#,##0' }
const FIELDS = [
  { id: 'date', name: 'Date', format: 'dateFormat', formatOptions: { format: 'dd mmm yyyy' } },
  { id: 'month', name: 'Month', format: 'textFormat' },
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
const PAGE_PADDING = 8
const KPI_ROWS = 7
const CHART_ROWS = 18
const LEDGER_ROWS = 24
const TOTAL_ROWS = KPI_ROWS + CHART_ROWS + LEDGER_ROWS
const HEIGHT = TOTAL_ROWS * ROW_HEIGHT + 2 * PAGE_PADDING

// The edit panels are for building reports and the Filters panel would only repeat the filter buttons
// above the dashboard, so view mode shows the page alone. (Clicking a bar or a slice still filters.)
const PANELS: AgPanelConfig = { view: { left: [], right: [] } }

const kpi = (caption: string, field: string, aggregation: 'sum' | 'avg') => ({
  type: 'value',
  dataMapping: { value: [{ id: col(field), aggregation }] },
  format: { caption: { enabled: true, text: caption } },
})

const STATE = {
  pages: [
    {
      id: 'sales-history',
      widgets: {
        // Only paid deals count in the first four tiles: their fields are empty for every other deal.
        'kpi-revenue': kpi('Revenue earned', 'revenue', 'sum'),
        'kpi-sales': kpi('Sales completed', 'sold', 'sum'),
        'kpi-average': kpi('Average sale', 'revenue', 'avg'),
        'kpi-discount': kpi('Average discount', 'soldDiscount', 'avg'),
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
          type: 'pie-chart',
          dataMapping: {
            categoryKey: [{ id: col('status') }],
            valueKey: [{ id: col('deals'), aggregation: 'sum' }],
          },
          format: { title: { enabled: true, text: 'How deals ended' } },
        },
        ledger: {
          type: 'grid',
          dataMapping: {
            cols: ['date', 'buyer', 'service', 'listPrice', 'finalPrice', 'discount', 'aboveFloor', 'rounds', 'status'].map(
              (c) => ({ id: col(c) }),
            ),
          },
          format: {
            title: { enabled: true, text: 'Sales ledger' },
            style: { theme: { rowHeight: 34 } },
          },
        },
      },
      widgetLayout: {
        'kpi-revenue': { xTrack: 0, yTrack: 0, xSpan: 6, ySpan: KPI_ROWS },
        'kpi-sales': { xTrack: 6, yTrack: 0, xSpan: 6, ySpan: KPI_ROWS },
        'kpi-average': { xTrack: 12, yTrack: 0, xSpan: 6, ySpan: KPI_ROWS },
        'kpi-discount': { xTrack: 18, yTrack: 0, xSpan: 6, ySpan: KPI_ROWS },
        'revenue-by-month': { xTrack: 0, yTrack: KPI_ROWS, xSpan: 15, ySpan: CHART_ROWS },
        outcomes: { xTrack: 15, yTrack: KPI_ROWS, xSpan: 9, ySpan: CHART_ROWS },
        ledger: { xTrack: 0, yTrack: KPI_ROWS + CHART_ROWS, xSpan: 24, ySpan: LEDGER_ROWS },
      },
    },
  ],
  selectedPageId: 'sales-history',
}

/**
 * The seller's sales history as an AG Studio dashboard: four totals, revenue by month, how deals ended,
 * and the full ledger. Clicking a bar or a slice filters the other widgets, and clicking it again clears it.
 * It only shows the seller's own deals and their own price floor.
 */
export default function SalesHistoryStudio({ sales }: { sales: SellerSale[] }) {
  const rowsJson = JSON.stringify(toStudioRows(sales))

  // Stable objects: Studio reads them again only when the deals really change.
  const data = useMemo(() => ({ sources: [{ id: SOURCE, name: 'Sales', data: JSON.parse(rowsJson), fields: FIELDS }] }), [rowsJson])
  const layout = useMemo(() => ({ minWidth: 880, rowHeight: ROW_HEIGHT, pagePadding: PAGE_PADDING, height: HEIGHT }), [])

  // The state object follows the AG Studio docs; it is typed loosely here so the compiler does not reject a
  // valid shape. If Studio reports it as invalid, re-create it in edit mode and copy it with getState().
  const studio: ReactNode = (
    <AgStudio
      style={{ width: '100%', height: '100%' }}
      data={data as never}
      initialState={STATE as never}
      mode="view"
      panels={PANELS}
      layout={layout}
      theme={appStudioTheme as never}
    />
  )
  return (
    <div className="sales-studio" style={{ height: HEIGHT }}>
      {STUDIO_LICENSE ? <AgStudioProvider licenseKey={STUDIO_LICENSE}>{studio}</AgStudioProvider> : studio}
    </div>
  )
}
