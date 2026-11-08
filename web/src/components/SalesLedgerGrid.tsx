import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type GridApi,
  type GridReadyEvent,
  type GetRowIdParams,
} from 'ag-grid-community'
import { AgGridReact, type CustomCellRendererProps, type CustomNoRowsOverlayProps } from 'ag-grid-react'
import { CloseIcon, SearchIcon } from './icons'
import { useNarrow } from '../hooks/useNarrow'
import { DENSITY, ledgerTheme, type Density } from '../lib/ledgerTheme'
import { aboveFloorOf, discountOf, groupOf, outcomeLabel, type SaleGroup } from '../lib/sales'
import { USE_MOCK } from '../api/config'
import { DEMO_AGREED_ID, DEMO_SELLER_ENDED_ID, DEMO_SELLER_NEGOTIATION_ID } from '../data/mock'
import type { SaleOutcome, SellerSale } from '../types/dashboard'

// Loaded on demand by SalesHistory, so AG Grid is only downloaded when a seller opens their history.
ModuleRegistry.registerModules([AllCommunityModule])

/** One line of the ledger: the sale, reshaped for the grid. */
type LedgerRow = {
  id: string
  date: Date
  buyer: string
  service: string
  listPrice: number
  finalPrice: number | null
  discount: number | null
  aboveFloor: number | null
  rounds: number
  outcome: SaleOutcome
  group: Exclude<SaleGroup, 'all'>
  /** Only the totals row. */
  totals?: boolean
  soldCount?: number
}

const MAX_ROUNDS = 3
const PAGE_SIZES = [10, 25, 50]
const PAGINATION_HEIGHT = 48
const HEADER_HEIGHT = 46

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
const pct = (n: number) => `${(n * 100).toFixed(1)}%`
const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

/** A stable hue per buyer, so the same person always gets the same avatar colour. */
function hueOf(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

/** The deals that can be opened: all of them for the real back end, only the ones the demo knows about in demo mode. */
const DEMO_OPENABLE = new Set([DEMO_AGREED_ID, DEMO_SELLER_ENDED_ID, DEMO_SELLER_NEGOTIATION_ID])
const canOpen = (id: string) => !USE_MOCK || DEMO_OPENABLE.has(id)

/** Where a row's deal lives: open deals go to the approval and payment screen, finished ones to the negotiation. */
const dealPath = (r: LedgerRow) => (r.group === 'progress' ? `/negotiations/${r.id}/pay` : `/negotiations/${r.id}`)

const dash = <span className="ledger-dash" aria-label="Not applicable">–</span>

function toRow(s: SellerSale): LedgerRow {
  return {
    id: s.id,
    date: new Date(s.date),
    buyer: s.buyerName,
    service: s.service,
    listPrice: s.listPrice,
    finalPrice: s.agreedPrice,
    discount: discountOf(s),
    aboveFloor: aboveFloorOf(s),
    rounds: s.rounds,
    outcome: s.outcome,
    group: groupOf(s.outcome),
  }
}

// ---------- Cell renderers ----------

function DateCell({ value, node }: CustomCellRendererProps<LedgerRow, Date>) {
  if (node.rowPinned) return null
  if (!value || Number.isNaN(value.getTime())) return dash
  return (
    <span className="ledger-date">
      <strong>{value.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</strong>
      <span>{value.getFullYear()}</span>
    </span>
  )
}

function BuyerCell({ data, node, value }: CustomCellRendererProps<LedgerRow, string>) {
  if (node.rowPinned) return <span className="ledger-total-label">Sold deals in view</span>
  if (!data) return null
  const hue = hueOf(data.buyer)
  return (
    <span className="ledger-buyer">
      <span
        className="ledger-avatar"
        aria-hidden="true"
        style={{ background: `hsl(${hue} 70% 94%)`, color: `hsl(${hue} 60% 28%)` }}
      >
        {initialsOf(data.buyer)}
      </span>
      <span className="ledger-ellipsis">{value}</span>
    </span>
  )
}

function ServiceCell({ data, node, value }: CustomCellRendererProps<LedgerRow, string>) {
  if (node.rowPinned) {
    const n = data?.soldCount ?? 0
    return (
      <span className="ledger-total-note">
        {n} {n === 1 ? 'sale' : 'sales'}
      </span>
    )
  }
  return <span className="ledger-ellipsis">{value}</span>
}

function ListPriceCell({ value }: CustomCellRendererProps<LedgerRow, number>) {
  return <span className="ledger-money ledger-money--muted">{value == null ? '–' : money(value)}</span>
}

function FinalPriceCell({ value, node }: CustomCellRendererProps<LedgerRow, number | null>) {
  if (value == null) return dash
  return <span className={`ledger-money ledger-money--strong${node.rowPinned ? ' is-total' : ''}`}>{money(value)}</span>
}

/** A thin bar next to the number: the longer it is, the more the buyer talked the price down. */
function DiscountCell({ value }: CustomCellRendererProps<LedgerRow, number | null>) {
  if (value == null) return dash
  const tier = value >= 0.15 ? 'high' : value >= 0.08 ? 'mid' : 'low'
  return (
    <span className="ledger-discount" title={`${pct(value)} below the list price`}>
      <span className="ledger-bar" aria-hidden="true">
        <span className={`ledger-bar-fill is-${tier}`} style={{ width: `${Math.min(100, (value / 0.25) * 100)}%` }} />
      </span>
      <span className="ledger-money">{pct(value)}</span>
    </span>
  )
}

function AboveFloorCell({ value }: CustomCellRendererProps<LedgerRow, number | null>) {
  if (value == null) return dash
  const safe = value >= 0
  return (
    <span className={`ledger-money ledger-floor ${safe ? 'is-safe' : 'is-under'}`} title="How far the price is above your own floor">
      {safe ? '+' : '−'}
      {money(Math.abs(value))}
    </span>
  )
}

/** Three dots: how many of the three rounds the negotiation used. */
function RoundsCell({ data, node, value }: CustomCellRendererProps<LedgerRow, number>) {
  if (node.rowPinned) return <span className="ledger-total-note">{value ? `${value.toFixed(1)} avg` : ''}</span>
  const rounds = value ?? 0
  const label =
    data?.group === 'lost' ? `Ended after ${rounds} of ${MAX_ROUNDS} rounds` : `Agreed in round ${rounds} of ${MAX_ROUNDS}`
  return (
    <span className="ledger-rounds" role="img" aria-label={label} title={label}>
      {Array.from({ length: MAX_ROUNDS }, (_, i) => (
        <span key={i} className={`ledger-dot${i < rounds ? ' is-on' : ''}`} />
      ))}
    </span>
  )
}

function StatusCell({ data, node }: CustomCellRendererProps<LedgerRow, SaleOutcome>) {
  if (node.rowPinned || !data) return null
  return (
    <span className={`ledger-pill ledger-pill--${data.outcome}`}>
      <span className="ledger-pill-dot" aria-hidden="true" />
      {outcomeLabel[data.outcome]}
    </span>
  )
}

function OpenCell({ data, node }: CustomCellRendererProps<LedgerRow>) {
  const navigate = useNavigate()
  if (node.rowPinned || !data || !canOpen(data.id)) return null
  const open = data.group === 'progress'
  return (
    <button
      type="button"
      className="ledger-open"
      aria-label={`${open ? 'Continue' : 'View'} the deal with ${data.buyer}`}
      title={open ? 'Continue this deal' : 'View this deal'}
      onClick={() => navigate(dealPath(data))}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

function NoRowsOverlay({ onClear }: CustomNoRowsOverlayProps & { onClear: () => void }) {
  return (
    <div className="ledger-empty" role="status">
      <strong>No deals match your search</strong>
      <span>Try a buyer, a service or a status like “Paid”.</span>
      <button type="button" className="btn btn-secondary" onClick={onClear}>
        Clear search
      </button>
    </div>
  )
}

// ---------- The grid ----------

type Totals = { sold: number; list: number; final: number; above: number; rounds: number }

function totalsRow(t: Totals): LedgerRow {
  return {
    id: 'totals',
    totals: true,
    soldCount: t.sold,
    date: new Date(NaN),
    buyer: '',
    service: '',
    listPrice: t.list,
    finalPrice: t.sold ? t.final : null,
    discount: t.sold && t.list > 0 ? (t.list - t.final) / t.list : null,
    aboveFloor: t.sold ? t.above : null,
    rounds: t.sold ? t.rounds / t.sold : 0,
    outcome: 'paid',
    group: 'sold',
  }
}

/**
 * The sales ledger as an AG Grid: sortable, filterable, resizable, searchable, selectable and exportable.
 * The totals row under the grid always adds up the paid deals that are on screen right now, so it follows
 * the search box, the column filters and the buttons above the grid.
 */
export default function SalesLedgerGrid({ sales }: { sales: SellerSale[] }) {
  const navigate = useNavigate()
  const narrow = useNarrow()
  const apiRef = useRef<GridApi<LedgerRow> | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [density, setDensity] = useState<Density>('comfortable')
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [shownCount, setShownCount] = useState(sales.length)
  const [selection, setSelection] = useState({ count: 0, total: 0 })
  const [filtered, setFiltered] = useState(false)

  const rowData = useMemo(() => sales.map(toRow), [sales])
  const rowHeight = DENSITY[density]

  const columnDefs = useMemo<ColDef<LedgerRow>[]>(
    () => [
      {
        colId: 'date',
        headerName: 'Date',
        field: 'date',
        flex: 0.7,
        minWidth: narrow ? 70 : 80,
        sort: 'desc',
        filter: 'agDateColumnFilter',
        cellRenderer: DateCell,
        // The CSV gets a plain YYYY-MM-DD instead of the two-line look.
        valueFormatter: (p) => (p.value instanceof Date && !Number.isNaN(p.value.getTime()) ? p.value.toISOString().slice(0, 10) : ''),
      },
      { colId: 'buyer', headerName: 'Buyer', field: 'buyer', flex: 1.3, minWidth: narrow ? 118 : 168, cellRenderer: BuyerCell },
      { colId: 'service', hide: narrow, headerName: 'Service', field: 'service', flex: 1.4, minWidth: 148, cellRenderer: ServiceCell },
      {
        colId: 'listPrice', hide: narrow,
        headerName: 'List price',
        field: 'listPrice',
        type: 'rightAligned',
        flex: 0.7,
        minWidth: 84,
        filter: 'agNumberColumnFilter',
        cellRenderer: ListPriceCell,
      },
      {
        colId: 'finalPrice',
        headerName: 'Final price',
        field: 'finalPrice',
        type: 'rightAligned',
        flex: 0.8,
        minWidth: narrow ? 76 : 96,
        filter: 'agNumberColumnFilter',
        // A deal that changes while the page is open (the history refreshes itself) flashes briefly.
        enableCellChangeFlash: true,
        cellRenderer: FinalPriceCell,
      },
      {
        colId: 'discount', hide: narrow,
        headerName: 'Discount',
        field: 'discount',
        flex: 1.1,
        minWidth: 112,
        filter: 'agNumberColumnFilter',
        filterValueGetter: (p) => (p.data?.discount == null ? null : p.data.discount * 100),
        valueFormatter: (p) => (p.value == null ? '' : pct(p.value)),
        cellRenderer: DiscountCell,
      },
      {
        colId: 'aboveFloor', hide: narrow,
        headerName: 'Above floor',
        field: 'aboveFloor',
        type: 'rightAligned',
        flex: 0.9,
        minWidth: 100,
        filter: 'agNumberColumnFilter',
        headerTooltip: 'How far the final price is above the lowest price you said you would accept.',
        cellRenderer: AboveFloorCell,
      },
      {
        colId: 'rounds', hide: narrow,
        headerName: 'Rounds',
        field: 'rounds',
        flex: 0.7,
        minWidth: 78,
        filter: 'agNumberColumnFilter',
        cellRenderer: RoundsCell,
      },
      {
        colId: 'status',
        headerName: 'Status',
        field: 'outcome',
        flex: 1.2,
        minWidth: narrow ? 138 : 166,
        filter: 'agTextColumnFilter',
        valueFormatter: (p) => (p.value ? outcomeLabel[p.value as SaleOutcome] : ''),
        enableCellChangeFlash: true,
        cellRenderer: StatusCell,
      },
      {
        colId: 'open',
        headerName: '',
        width: 48,
        pinned: 'right',
        sortable: false,
        filter: false,
        resizable: false,
        suppressMovable: true,
        suppressHeaderMenuButton: true,
        suppressNavigable: false,
        cellClass: 'ledger-open-cell',
        cellRenderer: OpenCell,
      },
    ],
    [narrow],
  )

  const defaultColDef = useMemo<ColDef<LedgerRow>>(
    () => ({
      sortable: true,
      resizable: true,
      suppressMovable: false,
      cellStyle: { display: 'flex', alignItems: 'center' },
    }),
    [],
  )

  // The totals follow whatever the grid is showing: search, column filters and the buttons above it.
  const refreshTotals = useCallback((api: GridApi<LedgerRow>) => {
    const t: Totals = { sold: 0, list: 0, final: 0, above: 0, rounds: 0 }
    let shown = 0
    api.forEachNodeAfterFilter((node) => {
      shown += 1
      const r = node.data
      if (!r || r.outcome !== 'paid' || r.finalPrice == null) return
      t.sold += 1
      t.list += r.listPrice
      t.final += r.finalPrice
      t.above += r.aboveFloor ?? 0
      t.rounds += r.rounds
    })
    setShownCount(shown)
    setFiltered(api.isAnyFilterPresent() || api.isQuickFilterPresent())
    api.setGridOption('pinnedBottomRowData', shown > 0 ? [totalsRow(t)] : [])
  }, [])

  const onGridReady = useCallback(
    (e: GridReadyEvent<LedgerRow>) => {
      apiRef.current = e.api
      refreshTotals(e.api)
    },
    [refreshTotals],
  )

  const onSelectionChanged = useCallback(() => {
    const api = apiRef.current
    if (!api) return
    const rows = api.getSelectedRows()
    setSelection({ count: rows.length, total: rows.reduce((sum, r) => sum + (r.finalPrice ?? 0), 0) })
  }, [])

  // Search box -> AG Grid's quick filter, which looks at every visible column's text.
  useEffect(() => {
    apiRef.current?.setGridOption('quickFilterText', search)
  }, [search])

  // A new density changes the row height; the grid re-lays out by itself.
  useEffect(() => {
    apiRef.current?.setGridOption('rowHeight', rowHeight)
    apiRef.current?.resetRowHeights()
  }, [rowHeight])

  // "/" jumps to the search box, like most tables people live in.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function resetView() {
    const api = apiRef.current
    if (!api) return
    setSearch('')
    api.setFilterModel(null)
    api.applyColumnState({ defaultState: { sort: null }, state: [{ colId: 'date', sort: 'desc' }] })
    api.deselectAll()
  }

  function exportCsv() {
    apiRef.current?.exportDataAsCsv({
      fileName: `sales-history-${new Date().toISOString().slice(0, 10)}.csv`,
      columnKeys: ['date', 'buyer', 'service', 'listPrice', 'finalPrice', 'discount', 'aboveFloor', 'rounds', 'status'],
      onlySelected: selection.count > 0,
      processCellCallback: (p) => {
        if (p.column.getColId() === 'discount' && typeof p.value === 'number') return (p.value * 100).toFixed(1)
        return p.formatValue ? p.formatValue(p.value) : p.value
      },
    })
  }

  const noRowsOverlay = useCallback(
    (props: CustomNoRowsOverlayProps) => <NoRowsOverlay {...props} onClear={() => setSearch('')} />,
    [],
  )

  const getRowId = useCallback((p: GetRowIdParams<LedgerRow>) => p.data.id, [])

  const visibleRows = Math.max(1, Math.min(shownCount, pageSize))
  const pinned = shownCount > 0 ? 1 : 0
  const height = HEADER_HEIGHT + (visibleRows + pinned) * rowHeight + PAGINATION_HEIGHT + 2

  return (
    <div className="ledger">
      <div className="ledger-toolbar">
        <div className="ledger-search">
          <span className="ledger-search-icon" aria-hidden="true">
            <SearchIcon size={16} />
          </span>
          <input
            ref={searchRef}
            type="search"
            className="ledger-search-input"
            aria-label="Search the ledger"
            placeholder="Search buyer, service or status"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search ? (
            <button type="button" className="ledger-search-clear" aria-label="Clear search" onClick={() => setSearch('')}>
              <CloseIcon size={12} />
            </button>
          ) : (
            <kbd className="ledger-kbd" aria-hidden="true">
              /
            </kbd>
          )}
        </div>

        <div className="ledger-tools">
          <div className="ledger-seg" role="group" aria-label="Row spacing">
            {(['comfortable', 'compact'] as const).map((d) => (
              <button key={d} type="button" className={density === d ? 'is-active' : ''} aria-pressed={density === d} onClick={() => setDensity(d)}>
                {d === 'comfortable' ? 'Comfortable' : 'Compact'}
              </button>
            ))}
          </div>
          <button type="button" className="ledger-tool" onClick={resetView} disabled={!filtered && !search && selection.count === 0}>
            Reset view
          </button>
          <button type="button" className="ledger-tool ledger-tool--primary" onClick={exportCsv}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2v8m0 0L5 7m3 3 3-3M3 13h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {selection.count > 0 ? 'Export selected' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="ledger-status" aria-live="polite">
        {selection.count > 0 ? (
          <span className="ledger-selected">
            <strong>{selection.count}</strong> selected · {money(selection.total)} final price
            <button type="button" onClick={() => apiRef.current?.deselectAll()}>
              Clear
            </button>
          </span>
        ) : (
          <span>
            Showing <strong>{shownCount}</strong> of {rowData.length} deals
            <span className="ledger-tip"> · Click a header to sort, drag its edge to resize, use the menu to filter</span>
          </span>
        )}
      </div>

      <div className="ledger-grid" style={{ height }}>
        <AgGridReact<LedgerRow>
          theme={ledgerTheme}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={getRowId}
          rowHeight={rowHeight}
          headerHeight={HEADER_HEIGHT}
          animateRows
          rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: false }}
          selectionColumnDef={{ width: 44, pinned: 'left', resizable: false, suppressMovable: true }}
          pagination
          paginationPageSize={pageSize}
          paginationPageSizeSelector={PAGE_SIZES}
          onPaginationChanged={(e) => {
            const size = e.api.paginationGetPageSize()
            if (size !== pageSize) setPageSize(size)
          }}
          tooltipShowDelay={400}
          noRowsOverlayComponent={noRowsOverlay}
          onGridReady={onGridReady}
          onModelUpdated={(e) => refreshTotals(e.api)}
          onFilterChanged={(e) => refreshTotals(e.api)}
          onSelectionChanged={onSelectionChanged}
          onRowDoubleClicked={(e) => {
            if (e.data && canOpen(e.data.id) && !e.node.rowPinned) navigate(dealPath(e.data))
          }}
          getRowClass={(p) => (p.node.rowPinned ? 'ledger-row-total' : `ledger-row-${p.data?.group ?? ''}`)}
          suppressCellFocus={false}
          ensureDomOrder
        />
      </div>
    </div>
  )

}
