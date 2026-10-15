import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, POLL_MS } from '../api'
import GridBoundary from '../components/GridBoundary'
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

const groups: SaleGroup[] = ['all', 'sold', 'progress', 'lost']
const periods: SalePeriod[] = ['all', '90d', 'year']

type View = 'dashboard' | 'table'

/** The seller's sales history: what was sold, what is still open and what was lost, as an AG Studio dashboard. */
export default function SalesHistory() {
  const sales = useAsync(() => api.listSellerSales(), [])
  const [group, setGroup] = useState<SaleGroup>('all')
  const [period, setPeriod] = useState<SalePeriod>('all')
  const [view, setView] = useState<View>('dashboard')

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
    <div className="page-stack">
      <div className="page-head">
        <div>
          <h1>Sales history</h1>
          <p className="muted">Every deal your agent has closed or lost, and what you earned. Open deals update by themselves.</p>
        </div>
        <Link to="/seller" className="btn btn-secondary btn-lg">
          Back to my dashboard
        </Link>
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

      {sales.data && all.length > 0 && (
        <section aria-label="Sales history" className="card history-card">
          <div className="history-toolbar">
            <div className="history-filters" role="group" aria-label="Show deals">
              {groups.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`chip${group === g ? ' is-active' : ''}`}
                  aria-pressed={group === g}
                  onClick={() => setGroup(g)}
                >
                  {groupLabel[g]} <span className="chip-count">{counts[g]}</span>
                </button>
              ))}
            </div>
            <div className="history-filters" role="group" aria-label="Time period">
              {periods.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`chip${period === p ? ' is-active' : ''}`}
                  aria-pressed={period === p}
                  onClick={() => setPeriod(p)}
                >
                  {periodLabel[p]}
                </button>
              ))}
            </div>
            <div className="history-filters" role="group" aria-label="View">
              {(['dashboard', 'table'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`chip${view === v ? ' is-active' : ''}`}
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                >
                  {v === 'dashboard' ? 'Dashboard' : 'Simple table'}
                </button>
              ))}
            </div>
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
            <>
              <p className="muted small history-hint">Click a bar or a slice to filter the ledger. Click it again to clear.</p>
              <GridBoundary
                fallback={
                  <>
                    <p className="muted small">The dashboard could not load, so here is the table.</p>
                    {table}
                  </>
                }
              >
                <Suspense fallback={<p className="muted" role="status">Loading the dashboard...</p>}>
                  <SalesHistoryStudio sales={shown} />
                </Suspense>
              </GridBoundary>
            </>
          )}
        </section>
      )}
    </div>
  )
}
