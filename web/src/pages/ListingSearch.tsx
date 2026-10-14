import { useState, type FormEvent } from 'react'
import { api } from '../api'
import ServiceCard from '../components/ServiceCard'
import StartNotice from '../components/StartNotice'
import { ErrorCard, LoadingCard } from '../components/StateCards'
import { SearchIcon } from '../components/icons'
import { useAsync } from '../hooks/useAsync'
import { useStartNegotiation } from '../hooks/useStartNegotiation'
import { categories } from '../lib/categories'
import { parsePrice } from '../lib/forms'
import type { SearchSort } from '../types/marketplace'

type Filters = { keyword: string; category: string; maxPrice: string }

export default function ListingSearch() {
  // The first search matches the demo scenario. Clear the boxes to see everything.
  const [draft, setDraft] = useState<Filters>({ keyword: 'website', category: 'Web development', maxPrice: '500' })
  const [applied, setApplied] = useState(draft)
  const [sort, setSort] = useState<SearchSort>('match')

  const search = useAsync(
    () =>
      api.searchListings({
        keyword: applied.keyword.trim(),
        category: applied.category,
        maxPrice: parsePrice(applied.maxPrice),
        sort,
      }),
    [applied, sort],
  )
  const starter = useStartNegotiation('buyer', search.reload)

  const results = search.data ?? []

  function submit(e: FormEvent) {
    e.preventDefault()
    setApplied(draft)
  }

  // Pressing the chip that is already active shows every category again.
  function quickFilter(category: string) {
    const next = { ...draft, category: applied.category === category ? '' : category }
    setDraft(next)
    setApplied(next)
  }

  return (
    <div className="page-stack">
      <div>
        <h1>Search services</h1>
        <p className="muted">Find a freelancer, then let your agent negotiate the price in up to 3 rounds. The seller accepts your proposal before it starts.</p>
      </div>

      <form className="card search-filters" aria-label="Search filters" onSubmit={submit}>
        <div className="search-row">
          <div className="field search-kw">
            <label htmlFor="kw">Keyword</label>
            <input
              id="kw"
              className="input"
              type="text"
              placeholder="website, logo, blog post"
              value={draft.keyword}
              onChange={(e) => setDraft({ ...draft, keyword: e.target.value })}
            />
          </div>
          <div className="field search-cat">
            <label htmlFor="cat">Category</label>
            <select
              id="cat"
              className="input"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field search-price">
            <label htmlFor="maxp">Maximum list price (USD)</label>
            <input
              id="maxp"
              className="input"
              type="text"
              inputMode="numeric"
              placeholder="No limit"
              value={draft.maxPrice}
              onChange={(e) => setDraft({ ...draft, maxPrice: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg">
            <SearchIcon />
            Search
          </button>
        </div>
        <div className="search-quick">
          <span className="muted small">Quick filter</span>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip${applied.category === c ? ' is-active' : ''}`}
              aria-pressed={applied.category === c}
              onClick={() => quickFilter(c)}
            >
              {c}
            </button>
          ))}
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

      {starter.problem && <StartNotice problem={starter.problem} />}

      <div className="search-results-head">
        <h2>
          {search.data ? (
            <>
              {results.length} {results.length === 1 ? 'result' : 'results'}
              {applied.keyword.trim() && <> for "{applied.keyword.trim()}"</>}
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

      <section aria-label="Results" aria-busy={search.loading} className="search-results">
        {search.error != null && <ErrorCard error={search.error} onRetry={search.reload} />}
        {search.error == null && search.loading && !search.data && <LoadingCard label="Searching..." />}
        {search.error == null && search.data && results.length === 0 && (
          <p className="card muted">No services match. Try a different keyword or a higher price.</p>
        )}
        {search.error == null &&
          results.map((l) => (
            <ServiceCard
              key={l.id}
              listing={l}
              busy={starter.busyId === l.id}
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
