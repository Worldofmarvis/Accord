import { useState, type FormEvent } from 'react'
import { api } from '../api'
import CategoryChips from '../components/CategoryChips'
import RequestCard from '../components/RequestCard'
import SearchInput from '../components/SearchInput'
import StartNotice from '../components/StartNotice'
import { ErrorCard, LoadingCard } from '../components/StateCards'
import { useAsync } from '../hooks/useAsync'
import { useDebouncedText } from '../hooks/useDebouncedText'
import { useStartNegotiation } from '../hooks/useStartNegotiation'
import { categories } from '../lib/categories'
import type { RequestSort } from '../types/proposal'

type Filters = { keyword: string; category: string }

const NO_FILTERS: Filters = { keyword: '', category: '' }

// What a seller sees on the Search tab: buyer requests, with no prices (rule 5).
export default function RequestSearch() {
  // Every control applies as it changes: category right away, typed text after a short pause.
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [sort, setSort] = useState<RequestSort>('match')
  const keyword = useDebouncedText(filters.keyword.trim())

  const search = useAsync(
    () => api.searchRequests({ keyword, category: filters.category, sort }),
    [keyword, filters.category, sort],
  )
  const starter = useStartNegotiation('seller')
  const results = search.data ?? []
  const hasFilters = filters.keyword !== '' || filters.category !== ''
  const change = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }))

  // Pressing Enter just keeps the page from reloading; the results are already live.
  const submit = (e: FormEvent) => e.preventDefault()

  return (
    <div className="page-stack">
      <div>
        <h1>Search buyer requests</h1>
        <p className="muted">
          See what buyers need, then offer one of your listings. The buyer accepts your proposal before the
          negotiation starts.
        </p>
      </div>

      <form className="card search-filters" role="search" aria-label="Search filters" onSubmit={submit}>
        <div className="search-row">
          <SearchInput
            id="kw"
            label="Search"
            placeholder="Project, deliverable or buyer name"
            value={filters.keyword}
            onChange={(keyword) => change({ keyword })}
          />
        </div>
        <div className="search-filter-bar">
          <CategoryChips categories={categories} value={filters.category} onChange={(category) => change({ category })} />
          {hasFilters && (
            <button type="button" className="btn-link" onClick={() => setFilters(NO_FILTERS)}>
              Clear filters
            </button>
          )}
        </div>
      </form>

      {starter.options.length > 1 && (
        <div className="field">
          <label htmlFor="negotiate-with">Negotiate using this listing</label>
          <select
            id="negotiate-with"
            className="input"
            value={starter.selected?.id}
            onChange={(e) => starter.pick(e.target.value)}
          >
            {starter.options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        </div>
      )}
      {starter.options.length === 1 && starter.selected && (
        <p className="muted small">Your agent will negotiate using your listing "{starter.selected.title}".</p>
      )}

      {starter.problem && <StartNotice problem={starter.problem} />}

      <div className="search-results-head">
        <h2>
          {search.data ? (
            <>
              {results.length} {results.length === 1 ? 'request' : 'requests'}
              {keyword && <> for "{keyword}"</>}
              {filters.category && <> in {filters.category}</>}
            </>
          ) : (
            'Requests'
          )}
        </h2>
        <div className="search-sort">
          <label htmlFor="sort" className="muted small">
            Sort by
          </label>
          <select
            id="sort"
            className="input input-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as RequestSort)}
          >
            <option value="match">Best match</option>
            <option value="deadline">Deadline: soonest first</option>
          </select>
        </div>
      </div>

      <section aria-label="Results" aria-busy={search.loading} className={`search-results${search.loading && search.data ? ' is-loading' : ''}`}>
        {search.error != null && <ErrorCard error={search.error} onRetry={search.reload} />}
        {search.error == null && search.loading && !search.data && <LoadingCard label="Searching..." />}
        {search.error == null && search.data && results.length === 0 && (
          <div className="card search-empty">
            <p className="muted">No requests match these filters. Try fewer words or another category.</p>
            {hasFilters && (
              <button type="button" className="btn btn-secondary" onClick={() => setFilters(NO_FILTERS)}>
                Clear filters
              </button>
            )}
          </div>
        )}
        {search.error == null &&
          results.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              busy={starter.busyId === r.id}
              onNegotiate={(request) => void starter.start({ id: request.id, name: request.buyerName })}
            />
          ))}
      </section>

      <p className="muted small">
        Buyers' budgets are private. Your agent negotiates the price, and nothing is final until both of you approve.
      </p>
    </div>
  )
}
