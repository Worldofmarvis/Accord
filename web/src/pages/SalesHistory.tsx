import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, POLL_MS } from '../api'
import GridBoundary from '../components/GridBoundary'
import SalesKpis from '../components/SalesKpis'
import SalesTable from '../components/SalesTable'
import { ErrorCard, LoadingCard } from '../components/StateCards'
import { useAsync } from '../hooks/useAsync'
import {
  groupLabel,
  groupOf,
  inPeriod,
  isOpen,
  periodLabel,
  type SaleGroup,
  type SalePeriod,
} from '../lib/sales'

const SalesHistoryStudio = lazy(() => import('../components/SalesHistoryStudio'))
const SalesLedgerGrid = lazy(() => import('../components/SalesLedgerGrid'))

const groups: SaleGroup[] = ['all', 'sold', 'progress', 'lost']
const periods: SalePeriod[] = ['all', '90d', 'year']

type View = 'grid' | 'table'

/**
 * The seller's sales history: what was sold, what is still open and what was lost.
 * Summary cards and AG Studio charts follow the time period; the AG Grid ledger below also follows the deal filter.
 */
export default function SalesHistory() {
  const sales = useAsync(() => api.listSellerSales(), [])
  const [group, setGroup] = useState<SaleGroup>('all')
  const [period, setPeriod] = useState<SalePeriod>('all')
  const [view, setView] = useState<View>('grid')

  const all = useMemo(() => sales.data ?? [], [sales.data])

  // A deal waiting for approval or payment can still change, so look again every few seconds while one is open.
  const open = all.some(isOpen)
  const reloadRef = useRef(sales.reload)
  useEffect(() => {
    reloadRef.current = sales.reload
  })
  useEffect(() => {
    if (!open) return
    const timer = setInterval(() => {
      if (!document.hidden) reloadRef.current()
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [open])

  // The period narrows everything. The counts on the group buttons follow it, so they always add up.
  const inRange = useMemo(() => all.filter((s) => inPeriod(s, period)), [all, period])
  const counts = useMemo(() => {
    const c: Record<SaleGroup, number> = { all: inRange.length, sold: 0, progress: 0, lost: 0 }
    for (const s of inRange) c[groupOf(s.outcome)] += 1
    return c
  }, [inRange])
  const shown = useMemo(() => (group === 'all' ? inRange : inRange.filter((s) => groupOf(s.outcome) === group)), [inRange, group])

  function resetFilters() {
    setGroup('all')
    setPeriod('all')
  }

  const table = <SalesTable sales={shown} />

  return (
    <div className="page-stack page-wide">
      <div className="page-head">
        <div>
          <h1>Sales history</h1>
          <p className="muted">Every deal your agent has closed or lost, and what you earned. Open deals update by themselves.</p>
        </div>
        <div className="history-head-actions">
          {all.length > 0 && (
            <div className="history-seg" role="group" aria-label="Time period">
              {periods.map((p) => (
                <button key={p} type="button" className={period === p ? 'is-active' : ''} aria-pressed={period === p} onClick={() => setPeriod(p)}>
                  {periodLabel[p]}
                </button>
              ))}
            </div>
          )}
          <Link to="/seller" className="btn btn-secondary btn-lg">
            Back to my dashboard
          </Link>
        </div>
      </div>

      {sales.error != null && <ErrorCard error={sales.error} onRetry={sales.reload} />}
      {sales.error == null && !sales.data && <LoadingCard label="Loading your sales history..." />}

      {sales.data && all.length === 0 && (
        <section aria-label="No sales yet" className="card history-empty">
          <h2 className="card-title">No sales yet</h2>
          <p className="muted">When a negotiation of yours is agreed, paid or ended, it shows up here.</p>
          <Link to="/search" className="btn btn-primary btn-lg">
            Find customers
          </Link>
        </section>
      )}

      {sales.data && all.length > 0 && inRange.length === 0 && (
        <section aria-label="No deals in this period" className="card history-empty">
          <h2 className="card-title">No deals in this period</h2>
          <p className="muted">Nothing was closed or lost in {periodLabel[period].toLowerCase()}.</p>
          <button type="button" className="btn btn-secondary btn-lg" onClick={resetFilters}>
            Show all time
          </button>
        </section>
      )}

      {sales.data && inRange.length > 0 && (
        <>
          <SalesKpis sales={inRange} />

          <section aria-label="Trends" className="card history-trends">
            <GridBoundary fallback={null}>
              <Suspense fallback={<p className="muted" role="status">Loading the charts...</p>}>
                <SalesHistoryStudio sales={inRange} />
              </Suspense>
            </GridBoundary>
          </section>

          <section aria-label="Sales ledger" className="card history-card">
            <div className="history-toolbar">
              <div>
                <h2 className="history-title">Sales ledger</h2>
                <p className="muted small history-hint">Select rows to total them, or double-click a row to open the deal.</p>
              </div>
              <div className="history-seg history-seg--view" role="group" aria-label="View">
                {(['grid', 'table'] as const).map((v) => (
                  <button key={v} type="button" className={view === v ? 'is-active' : ''} aria-pressed={view === v} onClick={() => setView(v)}>
                    {v === 'grid' ? 'Interactive grid' : 'Plain table'}
                  </button>
                ))}
              </div>
            </div>

            <div className="history-filters" role="group" aria-label="Show deals">
              {groups.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`chip chip-${g}${group === g ? ' is-active' : ''}`}
                  aria-pressed={group === g}
                  onClick={() => setGroup(g)}
                >
                  {groupLabel[g]} <span className="chip-count">{counts[g]}</span>
                </button>
              ))}
            </div>

            {shown.length === 0 ? (
              <div className="history-empty">
                <p className="muted">No deals match these filters.</p>
                <button type="button" className="btn btn-secondary btn-lg" onClick={resetFilters}>
                  Show all deals
                </button>
              </div>
            ) : view === 'table' ? (
              table
            ) : (
              <GridBoundary
                fallback={
                  <>
                    <p className="muted small">The interactive grid could not load, so here is the table.</p>
                    {table}
                  </>
                }
              >
                <Suspense fallback={<p className="muted" role="status">Loading the ledger...</p>}>
                  <SalesLedgerGrid sales={shown} />
                </Suspense>
              </GridBoundary>
            )}
          </section>
        </>
      )}
    </div>
  )
}
