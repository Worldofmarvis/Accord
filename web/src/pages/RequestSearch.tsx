import { useState, type FormEvent } from 'react'
import { api } from '../api'
import RequestCard from '../components/RequestCard'
import StartNotice from '../components/StartNotice'
import { ErrorCard, LoadingCard } from '../components/StateCards'
import { SearchIcon } from '../components/icons'
import { useAsync } from '../hooks/useAsync'
import { useStartNegotiation } from '../hooks/useStartNegotiation'
import { categories } from '../lib/categories'
import type { RequestSort } from '../types/proposal'

type Filters = { keyword: string; category: string }

// What a seller sees on the Search tab: buyer requests, with no prices (rule 5).
export default function RequestSearch() {
  const [draft, setDraft] = useState<Filters>({ keyword: '', category: '' })
  const [applied, setApplied] = useState(draft)
  const [sort, setSort] = useState<RequestSort>('match')

  const search = useAsync(
    () => api.searchRequests({ keyword: applied.keyword.trim(), category: applied.category, sort }),
    [applied, sort],
  )
  const starter = useStartNegotiation('seller')
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
        <h1>Search buyer requests</h1>
        <p className="muted">
          See what buyers need, then offer one of your listings. The buyer accepts your proposal before the
          negotiation starts.
        </p>
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
              {applied.keyword.trim() && <> for "{applied.keyword.trim()}"</>}
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

      <section aria-label="Results" aria-busy={search.loading} className="search-results">
        {search.error != null && <ErrorCard error={search.error} onRetry={search.reload} />}
        {search.error == null && search.loading && !search.data && <LoadingCard label="Searching..." />}
        {search.error == null && search.data && results.length === 0 && (
          <p className="card muted">No requests match. Try a different keyword or category.</p>
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
