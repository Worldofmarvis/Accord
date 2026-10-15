import { useState, type FormEvent } from 'react'
import { api } from '../api'
import CategoryChips from '../components/CategoryChips'
import SearchInput from '../components/SearchInput'
import ServiceCard from '../components/ServiceCard'
import StartNotice from '../components/StartNotice'
import { ErrorCard, LoadingCard } from '../components/StateCards'
import { useAsync } from '../hooks/useAsync'
import { useDebouncedText } from '../hooks/useDebouncedText'
import { useStartNegotiation } from '../hooks/useStartNegotiation'
import { categories } from '../lib/categories'
import { PRICE_ERROR, parsePrice } from '../lib/forms'
import type { SearchSort } from '../types/marketplace'

type Filters = { keyword: string; category: string; maxPrice: string }

const NO_FILTERS: Filters = { keyword: '', category: '', maxPrice: '' }

export default function ListingSearch() {
  // Every control applies as it changes: category right away, typed text after a short pause.
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [sort, setSort] = useState<SearchSort>('match')
  const keyword = useDebouncedText(filters.keyword.trim())
  const priceText = useDebouncedText(filters.maxPrice).trim()
  const maxPrice = parsePrice(priceText)
  // Typed but not a whole dollar amount: say so, instead of quietly ignoring it or reading it as another number.
  const priceInvalid = priceText !== '' && maxPrice === null

  const search = useAsync(
    () => api.searchListings({ keyword, category: filters.category, maxPrice, sort }),
    [keyword, filters.category, maxPrice, sort],
  )
  const starter = useStartNegotiation('buyer', search.reload)

  const results = search.data ?? []
  const hasFilters = filters.keyword !== '' || filters.category !== '' || filters.maxPrice !== ''
  const change = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }))

  // Pressing Enter just keeps the page from reloading; the results are already live.
  const submit = (e: FormEvent) => e.preventDefault()

  return (
    <div className="page-stack">
      <div>
        <h1>Search services</h1>
        <p className="muted">Find a freelancer, then let your agent negotiate the price in up to 3 rounds. The seller accepts your proposal before it starts.</p>
      </div>

      <form className="card search-filters" role="search" aria-label="Search filters" onSubmit={submit}>
        <div className="search-row">
          <SearchInput
            id="kw"
            label="Search"
            placeholder="Skill, project or seller name"
            value={filters.keyword}
            onChange={(keyword) => change({ keyword })}
          />
          <div className="field search-price">
            <label htmlFor="maxp">Maximum list price (USD)</label>
            <input
              id="maxp"
              className="input"
              type="text"
              inputMode="numeric"
              placeholder="No limit"
              value={filters.maxPrice}
              onChange={(e) => change({ maxPrice: e.target.value })}
              aria-invalid={priceInvalid}
              aria-describedby={priceInvalid ? 'maxp-error' : undefined}
            />
            {priceInvalid && (
              <span id="maxp-error" className="field-error" role="alert">
                {PRICE_ERROR} Showing all prices.
              </span>
            )}
          </div>
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
          <label htmlFor="negotiate-with">Negotiate using this request</label>
          <select
            id="negotiate-with"
            className="input"
            value={starter.selected?.id}
            onChange={(e) => starter.pick(e.target.value)}
          >
            {starter.options.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>
      )}
      {starter.options.length === 1 && starter.selected && (
        <p className="muted small">Your agent will negotiate using your request "{starter.selected.title}".</p>
      )}

      {starter.problem && starter.problem.kind !== 'sent' && <StartNotice problem={starter.problem} />}

      <div className="search-results-head">
        <h2>
          {search.data ? (
            <>
              {results.length} {results.length === 1 ? 'result' : 'results'}
              {keyword && <> for "{keyword}"</>}
              {filters.category && <> in {filters.category}</>}
            </>
          ) : (
            'Results'
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
            onChange={(e) => setSort(e.target.value as SearchSort)}
          >
            <option value="match">Best match</option>
            <option value="price">List price: low to high</option>
            <option value="delivery">Delivery time</option>
          </select>
        </div>
      </div>

      <section aria-label="Results" aria-busy={search.loading} className={`search-results${search.loading && search.data ? ' is-loading' : ''}`}>
        {search.error != null && <ErrorCard error={search.error} onRetry={search.reload} />}
        {search.error == null && search.loading && !search.data && <LoadingCard label="Searching..." />}
        {search.error == null && search.data && results.length === 0 && (
          <div className="card search-empty">
            <p className="muted">No services match these filters. Try fewer words or a higher price.</p>
            {hasFilters && (
              <button type="button" className="btn btn-secondary" onClick={() => setFilters(NO_FILTERS)}>
                Clear filters
              </button>
            )}
          </div>
        )}
        {search.error == null &&
          results.map((l) => (
            <ServiceCard
              key={l.id}
              listing={l}
              busy={starter.busyId === l.id}
              sent={starter.sent.has(l.id)}
              onNegotiate={(listing) => void starter.start({ id: listing.id, name: listing.sellerName })}
            />
          ))}
      </section>

      <p className="muted small">
        List price is the seller's starting price. Your agent negotiates for you, and nothing is final until you approve
        the agreed price.
      </p>
    </div>
  )
}
