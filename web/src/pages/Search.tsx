import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import ServiceCard from '../components/ServiceCard'
import { SearchIcon } from '../components/icons'
import { categories, DEMO_NEGOTIATION_ID, listings } from '../data/mock'
import type { Listing } from '../types/marketplace'

type Filters = { keyword: string; category: string; maxPrice: string }
type Sort = 'match' | 'price' | 'delivery'

const ALL = 'All categories'

function applyFilters(items: Listing[], f: Filters, sort: Sort): Listing[] {
  const kw = f.keyword.trim().toLowerCase()
  const max = Number(f.maxPrice.replace(/[^0-9.]/g, ''))
  const limit = f.maxPrice.trim() && Number.isFinite(max) ? max : Infinity

  const out = items.filter(
    (l) =>
      (!kw || `${l.title} ${l.description} ${l.sellerName}`.toLowerCase().includes(kw)) &&
      (f.category === ALL || l.categories.includes(f.category)) &&
      l.listPrice <= limit,
  )
  if (sort === 'price') out.sort((a, b) => a.listPrice - b.listPrice)
  if (sort === 'delivery') out.sort((a, b) => a.deliveryDays - b.deliveryDays)
  return out
}

export default function Search() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<Filters>({ keyword: 'website', category: 'Web development', maxPrice: '500' })
  const [applied, setApplied] = useState(draft)
  const [sort, setSort] = useState<Sort>('match')

  const results = useMemo(() => applyFilters(listings, applied, sort), [applied, sort])

  function submit(e: FormEvent) {
    e.preventDefault()
    setApplied(draft)
  }

  function quickFilter(category: string) {
    const next = { ...draft, category }
    setDraft(next)
    setApplied(next)
  }

  // TODO: create the negotiation through the API and use the id it returns.
  function startNegotiation(_listing: Listing) {
    navigate(`/negotiations/${DEMO_NEGOTIATION_ID}`)
  }

  return (
    <div className="page-stack">
      <div>
        <h1>Search services</h1>
        <p className="muted">Find a freelancer, then let your agent negotiate the price in up to 3 rounds.</p>
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
              <option>{ALL}</option>
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

      <div className="search-results-head">
        <h2>
          {results.length} {results.length === 1 ? 'result' : 'results'}
          {applied.keyword.trim() && <> for "{applied.keyword.trim()}"</>}
        </h2>
        <div className="search-sort">
          <label htmlFor="sort" className="muted small">
            Sort by
          </label>
          <select id="sort" className="input input-sm" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="match">Best match</option>
            <option value="price">List price: low to high</option>
            <option value="delivery">Delivery time</option>
          </select>
        </div>
      </div>

      <section aria-label="Results" className="search-results">
        {results.length === 0 && <p className="card muted">No services match. Try a different keyword or a higher price.</p>}
        {results.map((l) => (
          <ServiceCard key={l.id} listing={l} onNegotiate={startNegotiation} />
        ))}
      </section>

      <p className="muted small">
        List price is the seller's starting price. Your agent negotiates for you, and nothing is final until you approve
        the agreed price.
      </p>
    </div>
  )
}
