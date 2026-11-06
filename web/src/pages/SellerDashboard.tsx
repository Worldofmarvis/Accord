import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage, POLL_MS } from '../api'
import Badge from '../components/Badge'
import { ErrorCard, LoadingCard } from '../components/StateCards'
import { LockIcon } from '../components/icons'
import SellerSidebar from '../components/SellerSidebar'
import {
  ArrowRightIcon,
  ChartUpIcon,
  ChatBubbleIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  CrossCircleIcon,
  DocIcon,
  DollarIcon,
  GlobeIcon,
  HandshakeIcon,
  InfoIcon,
  ListingThumb,
  LockOpenIcon,
  PencilIcon,
  PlusIcon,
  SendIcon,
  ShieldIcon,
  StoreArt,
  TagIcon,
} from '../components/sellerArt'
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
    <div className="sd-shell">
      <SellerSidebar />

      <div className="sd-content">
        <div className="sd-hero">
          <div className="sd-hero-text">
            <h1 className="sd-title">
              Seller <span>Dashboard</span>
            </h1>
            <p className="sd-subtitle">Manage your listings. Track negotiations and grow your business.</p>
            <span className="sd-title-bar" aria-hidden="true" />
          </div>
          <Link to="/seller/history" className="sd-history-btn">
            <ChartUpIcon size={20} />
            View Sales History
            <ArrowRightIcon size={15} />
          </Link>
          <StoreArt />
        </div>

        {active && (
          <div className="sd-notice" role="status">
            <span className="sd-notice-icon">
              <InfoIcon size={32} />
            </span>
            <span className="sd-notice-text">
              You have an active negotiation (round {active.round} of {active.maxRounds}). Other buyers cannot start one
              with you until it ends.
            </span>
            <Link to={`/negotiations/${encodeURIComponent(active.negotiationId)}`} className="sd-notice-link">
              Open negotiation
              <ArrowRightIcon size={16} />
            </Link>
          </div>
        )}

        <div className="sd-grid">
          <form className="sd-card sd-form" onSubmit={submit} noValidate aria-label={editingId ? 'Edit listing' : 'New listing'}>
            <div className="sd-form-head">
              <span className="sd-form-badge" aria-hidden="true">
                <PlusIcon size={26} color="#fff" />
              </span>
              <div>
                <h2>{editingId ? 'Edit listing' : 'New listing'}</h2>
                <p>{editingId ? 'Update your service details.' : 'Start selling and reach more buyers.'}</p>
              </div>
            </div>

            <div className="field">
              <label htmlFor="lst-title">Service title</label>
              <IconField icon={<DocIcon size={20} />}>
                <input id="lst-title" className="input" type="text" placeholder="5-page business website" value={form.title} onChange={set('title')} {...err('title')} />
              </IconField>
              {errMsg('title')}
            </div>

            <div className="field">
              <label htmlFor="lst-cat">Category</label>
              <IconField icon={<GlobeIcon size={20} />} chevron={<ChevronDownIcon size={18} />}>
                <select id="lst-cat" className="input" value={form.category} onChange={set('category')}>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </IconField>
            </div>

            <div className="field">
              <label htmlFor="lst-deliv">Deliverables</label>
              <IconField icon={<PencilIcon size={20} />} top>
                <textarea id="lst-deliv" className="input textarea" placeholder="What the buyer receives..." value={form.deliverables} onChange={set('deliverables')} {...err('deliverables')} />
              </IconField>
              {errMsg('deliverables')}
            </div>

            <div className="field">
              <label htmlFor="lst-list">List price (USD)</label>
              <IconField icon={<DollarIcon size={20} />}>
                <input id="lst-list" className="input" type="text" inputMode="numeric" placeholder="Enter price" value={form.listPrice} onChange={set('listPrice')} {...err('listPrice')} />
              </IconField>
              {errMsg('listPrice')}
            </div>

            <div className="field">
              <label htmlFor="lst-floor">Price floor (USD)</label>
              <IconField icon={<ShieldIcon size={20} />}>
                <input id="lst-floor" className="input" type="text" inputMode="numeric" placeholder="Minimum price" value={form.priceFloor} onChange={set('priceFloor')} {...err('priceFloor')} />
              </IconField>
              {errMsg('priceFloor')}
            </div>

            <div className="field">
              <label htmlFor="lst-days">Delivery time (days)</label>
              <IconField icon={<ClockIcon size={20} />}>
                <input id="lst-days" className="input" type="text" inputMode="numeric" placeholder="Enter delivery time" value={form.deliveryDays} onChange={set('deliveryDays')} {...err('deliveryDays')} />
              </IconField>
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

            <div className="sd-form-actions">
              <button type="submit" className="sd-create-btn" disabled={submitting}>
                <SendIcon size={20} />
                {submitting ? 'Saving...' : editingId ? 'Save changes' : 'Create Listing'}
              </button>
              {editingId && (
                <button type="button" className="sd-cancel-btn" onClick={reset}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="sd-stack">
            <section aria-label="My negotiations" className="sd-card sd-panel">
              <header className="sd-panel-head">
                <span className="sd-panel-icon" aria-hidden="true">
                  <HandshakeIcon size={44} />
                </span>
                <div className="sd-panel-titles">
                  <h2>My negotiations</h2>
                  <p>Active, agreed and finished negotiations, newest first.</p>
                </div>
                <span className="sd-panel-note">Each lasts at most 3 rounds.</span>
              </header>
              <div className="sd-panel-body">
                {negotiations.error != null && <ErrorCard error={negotiations.error} onRetry={negotiations.reload} />}
                {negotiations.error == null && !negotiations.data && <LoadingCard label="Loading your negotiations..." />}
                {negotiations.error == null && negotiations.data?.length === 0 && (
                  <p className="dash-empty">No negotiations yet. A negotiation starts when a buyer accepts your proposal or you accept theirs.</p>
                )}
                {negotiations.error == null && negotiations.data?.map((n) => <NegotiationRow key={n.id} n={n} />)}
              </div>
            </section>

            <section aria-label="My listings" className="sd-card sd-panel">
              <header className="sd-panel-head">
                <span className="sd-panel-icon" aria-hidden="true">
                  <TagIcon size={44} />
                </span>
                <div className="sd-panel-titles">
                  <h2>My listings</h2>
                  <p>Prices cannot be changed on a listing while it is being negotiated.</p>
                </div>
                {listings.data && (
                  <span className="sd-panel-total">
                    Total: {listings.data.length} {listings.data.length === 1 ? 'listing' : 'listings'}
                  </span>
                )}
              </header>
              <div className="sd-panel-body">
                {listings.error != null && <ErrorCard error={listings.error} onRetry={listings.reload} />}
                {listings.error == null && !listings.data && <LoadingCard label="Loading your listings..." />}
                {listings.error == null && listings.data?.length === 0 && <p className="dash-empty">No listings yet.</p>}
                {listings.error == null &&
                  listings.data?.map((l) => {
                    const negotiated = active?.listingId === l.id
                    return (
                      <div key={l.id} className="sd-listing">
                        <div className="sd-thumb">
                          <ListingThumb />
                        </div>
                        <div className="sd-listing-main">
                          <div className="sd-tags">
                            <Badge tone="info">{l.category}</Badge>
                            {active && (
                              <Badge tone="warning">
                                {negotiated ? <LockOpenIcon size={12} /> : <LockIcon size={12} />}
                                {negotiated ? 'In negotiation' : 'Locked'}
                              </Badge>
                            )}
                          </div>
                          <h3 className="sd-listing-title">{l.title}</h3>
                          <p className="sd-listing-meta">
                            Delivery in {l.deliveryDays} days &bull; Your floor {usd(l.priceFloor)} (private)
                          </p>
                        </div>
                        <div className="sd-listing-price">
                          <span>List price</span>
                          <strong>{usd(l.listPrice)}</strong>
                        </div>
                        {/* The arrow is the Edit button: it opens this listing in the form. It stays locked while the listing is negotiated. */}
                        <button
                          type="button"
                          className="sd-listing-go"
                          disabled={negotiated}
                          aria-label={negotiated ? `${l.title}: editing locked while negotiated` : `Edit ${l.title}`}
                          title={negotiated ? 'Editing locked while negotiated' : 'Edit this listing'}
                          onClick={() => {
                            setForm(toForm(l))
                            setErrors({})
                            setEditingId(l.id)
                            setSaved(null)
                            setSubmitError(null)
                          }}
                        >
                          <ChevronRightIcon size={22} strokeWidth={2.6} />
                        </button>
                      </div>
                    )
                  })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

/** A form control with a small icon inside its left edge (and an optional arrow on the right, for the category list). */
function IconField({ icon, chevron, top, children }: { icon: ReactNode; chevron?: ReactNode; top?: boolean; children: ReactNode }) {
  return (
    <div className={`sd-icon-field${top ? ' sd-icon-field-top' : ''}`}>
      <span className="sd-field-icon" aria-hidden="true">
        {icon}
      </span>
      {children}
      {chevron && (
        <span className="sd-field-chevron" aria-hidden="true">
          {chevron}
        </span>
      )}
    </div>
  )
}

/** One negotiation in the seller's history, with the right next step for where it stands. */
function NegotiationRow({ n }: { n: SellerNegotiationRow }) {
  const path = `/negotiations/${encodeURIComponent(n.id)}`
  const deal = n.status === 'agreed' ? (n.deal ?? 'pending') : null

  // The round picture on the left follows where the negotiation stands.
  let tone: 'active' | 'pending' | 'approved' | 'neutral' = 'neutral'
  let icon: ReactNode = <DocIcon size={28} />
  if (n.status === 'active') {
    tone = 'active'
    icon = <ChatBubbleIcon size={30} />
  } else if (n.status === 'agreed' && deal === 'pending') {
    tone = 'pending'
    icon = <CheckCircleIcon size={34} />
  } else if (n.status === 'agreed' && deal === 'approved') {
    tone = 'approved'
    icon = <CheckCircleIcon size={34} />
  } else if (n.status === 'agreed' && deal === 'declined') {
    icon = <CrossCircleIcon size={34} />
  }

  return (
    <div className="sd-row">
      <span className={`sd-row-icon sd-row-icon-${tone}`} aria-hidden="true">
        {icon}
      </span>
      <div className="sd-row-main">
        <div className="sd-tags">
          {n.status === 'active' && (
            <Badge tone="info">
              Active, round {n.round} of {n.maxRounds}
            </Badge>
          )}
          {n.status === 'agreed' && deal === 'pending' && <Badge tone="warning">Agreed, waiting for approvals</Badge>}
          {n.status === 'agreed' && deal === 'approved' && <Badge tone="success">Deal approved</Badge>}
          {n.status === 'agreed' && deal === 'declined' && <Badge tone="neutral">Deal declined</Badge>}
          {n.status === 'no_agreement' && <Badge tone="neutral">No agreement</Badge>}
        </div>
        <h3 className="sd-row-title">{n.service}</h3>
        <p className="sd-row-meta">
          {n.buyerName} &bull;{' '}
          {n.status === 'agreed' && n.agreedPrice != null
            ? `Agreed at ${usd(n.agreedPrice)}`
            : `Buyer agent ${usd(n.buyerOffer)}, your agent ${usd(n.sellerOffer)}`}
        </p>
      </div>
      <div className="sd-row-action">
        {n.status === 'active' && (
          <Link to={path} className="sd-pill sd-pill-fill">
            Open negotiation
            <ArrowRightIcon size={16} />
          </Link>
        )}
        {n.status === 'agreed' && (
          <Link to={`${path}/pay`} className="sd-pill sd-pill-outline">
            {deal === 'pending' ? 'Review and approve' : 'View deal'}
            <ArrowRightIcon size={16} />
          </Link>
        )}
        {n.status === 'no_agreement' && (
          <Link to={path} className="sd-pill sd-pill-outline">
            See the result
            <ArrowRightIcon size={16} />
          </Link>
        )}
      </div>
    </div>
  )
}
