import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage, POLL_MS } from '../api'
import Badge from '../components/Badge'
import { ErrorCard, LoadingCard } from '../components/StateCards'
import { LockIcon } from '../components/icons'
import { useAsync } from '../hooks/useAsync'
import { categories } from '../lib/categories'
import { PRICE_ERROR, parseDays, parsePrice } from '../lib/forms'
import { usd } from '../lib/format'
import type { SellerListing, SellerNegotiationRow } from '../types/dashboard'
import '../styles/dashboards.css'

type Form = { title: string; category: string; deliverables: string; listPrice: string; priceFloor: string; deliveryDays: string }
type Errors = Partial<Record<keyof Form, string>>

const emptyForm: Form = { title: '', category: categories[0], deliverables: '', listPrice: '', priceFloor: '', deliveryDays: '' }

function validate(f: Form): Errors {
  const e: Errors = {}
  if (!f.title.trim()) e.title = 'Give the service a title.'
  if (!f.deliverables.trim()) e.deliverables = 'Describe what the buyer receives.'
  const list = parsePrice(f.listPrice)
  const floor = parsePrice(f.priceFloor)
  const days = parseDays(f.deliveryDays)
  if (list === null) e.listPrice = PRICE_ERROR
  if (floor === null) e.priceFloor = PRICE_ERROR
  if (list !== null && floor !== null && floor > list) e.priceFloor = 'Your price floor cannot be above the list price.'
  if (days === null) e.deliveryDays = 'Enter a whole number of days, like 7.'
  return e
}

const toForm = (l: SellerListing): Form => ({
  title: l.title,
  category: l.category,
  deliverables: l.deliverables,
  listPrice: String(l.listPrice),
  priceFloor: String(l.priceFloor),
  deliveryDays: String(l.deliveryDays),
})

export default function SellerDashboard() {
  const [form, setForm] = useState<Form>(emptyForm)
  const [errors, setErrors] = useState<Errors>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saved, setSaved] = useState<'added' | 'updated' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const listings = useAsync(() => api.listSellerListings(), [])
  const activeRequest = useAsync(() => api.getSellerActiveNegotiation(), [])
  const active = activeRequest.data ?? null
  const negotiations = useAsync(() => api.listSellerNegotiations(), [])

  // While something is still moving (a live negotiation, or a deal waiting for approvals), look for
  // changes every few seconds, so the list and the lock notice follow it all the way to the end.
  const rows = negotiations.data ?? []
  const live = active != null || rows.some((r) => r.status === 'active' || (r.status === 'agreed' && r.deal === 'pending'))
  const reloadRef = useRef({ list: negotiations.reload, active: activeRequest.reload })
  useEffect(() => {
    reloadRef.current = { list: negotiations.reload, active: activeRequest.reload }
  })
  useEffect(() => {
    if (!live) return
    const timer = setInterval(() => {
      if (document.hidden) return
      reloadRef.current.list()
      reloadRef.current.active()
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [live])

  const set = (key: keyof Form) => (e: { target: { value: string } }) => {
    setForm({ ...form, [key]: e.target.value })
    setSaved(null)
  }

  function reset() {
    setForm(emptyForm)
    setErrors({})
    setEditingId(null)
    setSubmitError(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    // The back end checks these rules too. Checking here just gives faster feedback.
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0 || submitting) return

    const input = {
      title: form.title.trim(),
      category: form.category,
      deliverables: form.deliverables.trim(),
      listPrice: parsePrice(form.listPrice) ?? 0,
      priceFloor: parsePrice(form.priceFloor) ?? 0,
      deliveryDays: parseDays(form.deliveryDays) ?? 0,
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      if (editingId) await api.updateSellerListing(editingId, input)
      else await api.createSellerListing(input)
      setSaved(editingId ? 'updated' : 'added')
      setForm(emptyForm)
      setEditingId(null)
      listings.reload()
      activeRequest.reload()
      negotiations.reload()
    } catch (err) {
      setSubmitError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const err = (key: keyof Form) => ({
    'aria-invalid': errors[key] ? (true as const) : undefined,
    'aria-describedby': errors[key] ? `${key}-error` : undefined,
  })
  const errMsg = (key: keyof Form) =>
    errors[key] ? (
      <span id={`${key}-error`} className="field-error">
        {errors[key]}
      </span>
    ) : null

  return (
    <div className="page-stack">
      <div className="page-head">
        <div>
          <h1>Seller dashboard</h1>
          <p className="muted">Manage your listings. Your agent will not accept a price below your floor.</p>
        </div>
        <Link to="/seller/history" className="btn btn-secondary btn-lg">
          View sales history
        </Link>
      </div>

      {active && (
        <div className="notice notice-warning" role="status">
          You have an active negotiation (round {active.round} of {active.maxRounds}). Other buyers cannot start one
          with you until it ends.{' '}
          <Link to={`/negotiations/${encodeURIComponent(active.negotiationId)}`}>Open negotiation</Link>
        </div>
      )}

      <div className="dash-layout">
        <form className="card dash-form" onSubmit={submit} noValidate aria-label={editingId ? 'Edit listing' : 'New listing'}>
          <h2>{editingId ? 'Edit listing' : 'New listing'}</h2>

          <div className="field">
            <label htmlFor="lst-title">Service title</label>
            <input id="lst-title" className="input" type="text" placeholder="5-page business website" value={form.title} onChange={set('title')} {...err('title')} />
            {errMsg('title')}
          </div>

          <div className="field">
            <label htmlFor="lst-cat">Category</label>
            <select id="lst-cat" className="input" value={form.category} onChange={set('category')}>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="lst-deliv">Deliverables</label>
            <textarea id="lst-deliv" className="input textarea" placeholder="What the buyer receives" value={form.deliverables} onChange={set('deliverables')} {...err('deliverables')} />
            {errMsg('deliverables')}
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="lst-list">List price (USD)</label>
              <input id="lst-list" className="input" type="text" inputMode="numeric" value={form.listPrice} onChange={set('listPrice')} {...err('listPrice')} />
              {errMsg('listPrice')}
            </div>
            <div className="field">
              <label htmlFor="lst-floor">Price floor (USD)</label>
              <input id="lst-floor" className="input" type="text" inputMode="numeric" value={form.priceFloor} onChange={set('priceFloor')} {...err('priceFloor')} />
              {errMsg('priceFloor')}
            </div>
          </div>

          <div className="field">
            <label htmlFor="lst-days">Delivery time (days)</label>
            <input id="lst-days" className="input" type="text" inputMode="numeric" value={form.deliveryDays} onChange={set('deliveryDays')} {...err('deliveryDays')} />
            {errMsg('deliveryDays')}
          </div>

          <div className="private-note">
            <LockIcon size={16} color="var(--color-primary)" />
            <span>Only you can see your price floor. Buyers see the list price, and the engine never offers below your floor.</span>
          </div>

          {saved && (
            <div className="notice notice-success" role="status">
              Listing {saved}.
            </div>
          )}
          {submitError && (
            <div className="notice notice-danger" role="alert">
              Your listing was not saved. {submitError}
            </div>
          )}

          <div className="dash-form-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
              {submitting ? 'Saving...' : editingId ? 'Save changes' : 'Add listing'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary btn-lg" onClick={reset}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="dash-list">
        <section aria-label="My negotiations" className="card">
          <h2 className="card-title">My negotiations</h2>
          <p className="muted small">Active, agreed and finished negotiations, newest first. Each lasts at most 3 rounds.</p>
          {negotiations.error != null && <ErrorCard error={negotiations.error} onRetry={negotiations.reload} />}
          {negotiations.error == null && !negotiations.data && <LoadingCard label="Loading your negotiations..." />}
          {negotiations.error == null && negotiations.data?.length === 0 && (
            <p className="dash-empty">No negotiations yet. A negotiation starts when a buyer accepts your proposal or you accept theirs.</p>
          )}
          {negotiations.error == null && negotiations.data?.map((n) => <NegotiationRow key={n.id} n={n} />)}
        </section>

        <section aria-label="My listings" className="card">
          <div>
            <h2 className="card-title">My listings</h2>
            <p className="muted small">Prices cannot be changed on a listing while it is being negotiated.</p>
          </div>
          {listings.error != null && <ErrorCard error={listings.error} onRetry={listings.reload} />}
          {listings.error == null && !listings.data && <LoadingCard label="Loading your listings..." />}
          {listings.error == null && listings.data?.length === 0 && <p className="dash-empty">No listings yet.</p>}
          {listings.error == null &&
            listings.data?.map((l) => {
              const negotiated = active?.listingId === l.id
              return (
                <div key={l.id} className="dash-item">
                  <div className="dash-item-main">
                    <div className="dash-item-tags">
                      <Badge tone="info">{l.category}</Badge>
                      {active && (
                        <Badge tone="warning">
                          <LockIcon size={12} />
                          {negotiated ? 'In negotiation' : 'Locked'}
                        </Badge>
                      )}
                    </div>
                    <h3 className="dash-item-title">{l.title}</h3>
                    <p className="dash-item-meta">{l.deliverables}</p>
                    <p className="dash-item-meta">Delivery in {l.deliveryDays} days</p>
                  </div>
                  <div className="dash-item-side">
                    <div className="dash-item-price">
                      <div className="muted caption">List price</div>
                      <div className="dash-item-amount">{usd(l.listPrice)}</div>
                      <div className="muted caption">Your floor {usd(l.priceFloor)} (private)</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-lg"
                      disabled={negotiated}
                      onClick={() => {
                        setForm(toForm(l))
                        setErrors({})
                        setEditingId(l.id)
                        setSaved(null)
                        setSubmitError(null)
                      }}
                    >
                      {negotiated ? 'Editing locked' : 'Edit'}
                    </button>
                  </div>
                </div>
              )
            })}
        </section>
        </div>
      </div>
    </div>
  )
}

/** One negotiation in the seller's history, with the right next step for where it stands. */
function NegotiationRow({ n }: { n: SellerNegotiationRow }) {
  const path = `/negotiations/${encodeURIComponent(n.id)}`
  const deal = n.status === 'agreed' ? (n.deal ?? 'pending') : null
  return (
    <div className="dash-item">
      <div className="dash-item-main">
        <div className="dash-item-tags">
          {n.status === 'active' && (
            <Badge tone="info">
              Active, round {n.round} of {n.maxRounds}
            </Badge>
          )}
          {n.status === 'agreed' && deal === 'pending' && <Badge tone="warning">Agreed, waiting for approvals</Badge>}
          {n.status === 'agreed' && deal === 'approved' && <Badge tone="success">Deal approved</Badge>}
          {n.status === 'agreed' && deal === 'declined' && <Badge tone="neutral">Deal declined</Badge>}
          {n.status === 'no_agreement' && <Badge tone="warning">No agreement</Badge>}
        </div>
        <h3 className="dash-item-title">{n.service}</h3>
        <p className="dash-item-meta">{n.buyerName}</p>
        <p className="dash-item-meta">
          {n.status === 'agreed' && n.agreedPrice != null
            ? `Agreed at ${usd(n.agreedPrice)}`
            : `Buyer agent ${usd(n.buyerOffer)}, your agent ${usd(n.sellerOffer)}`}
        </p>
      </div>
      <div className="dash-item-side">
        {n.status === 'active' && (
          <Link to={path} className="btn btn-primary btn-lg">
            Open negotiation
          </Link>
        )}
        {n.status === 'agreed' && (
          <Link to={`${path}/pay`} className={`btn btn-lg ${deal === 'pending' ? 'btn-primary' : 'btn-secondary'}`}>
            {deal === 'pending' ? 'Review and approve' : 'View deal'}
          </Link>
        )}
        {n.status === 'no_agreement' && (
          <Link to={path} className="btn btn-secondary btn-lg">
            See the result
          </Link>
        )}
      </div>
    </div>
  )
}
