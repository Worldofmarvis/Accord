import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../api'
import Badge from '../components/Badge'
import IconField from '../components/IconField'
import { ErrorCard, LoadingCard } from '../components/StateCards'
import { LockIcon, SearchIcon } from '../components/icons'
import {
  ArrowRightIcon,
  BagArt,
  CalendarIcon,
  ChatBubbleIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClipboardIcon,
  ClockIcon,
  DocIcon,
  DollarIcon,
  GlobeIcon,
  HandshakeIcon,
  PencilIcon,
  PlusIcon,
  RequestThumb,
  SendIcon,
  TargetIcon,
} from '../components/sellerArt'
import { useAsync } from '../hooks/useAsync'
import { categories } from '../lib/categories'
import { PRICE_ERROR, parsePrice, todayISO } from '../lib/forms'
import { usd } from '../lib/format'
import type { BuyerNegotiationRow } from '../types/dashboard'
import '../styles/dashboards.css'

type Form = { title: string; category: string; deliverables: string; deadline: string; target: string; max: string }
type Errors = Partial<Record<keyof Form, string>>

const emptyForm: Form = { title: '', category: categories[0], deliverables: '', deadline: '', target: '', max: '' }

function validate(f: Form): Errors {
  const e: Errors = {}
  if (!f.title.trim()) e.title = 'Describe what you need.'
  if (!f.deliverables.trim()) e.deliverables = 'List what you expect to receive.'
  if (!f.deadline) e.deadline = 'Choose a deadline.'
  else if (f.deadline < todayISO()) e.deadline = 'The deadline cannot be in the past.'
  const target = parsePrice(f.target)
  const max = parsePrice(f.max)
  if (target === null) e.target = PRICE_ERROR
  if (max === null) e.max = PRICE_ERROR
  if (target !== null && max !== null && max < target) e.max = 'Your maximum must be at least your target.'
  return e
}

export default function BuyerDashboard() {
  const [form, setForm] = useState<Form>(emptyForm)
  const [errors, setErrors] = useState<Errors>({})
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const requests = useAsync(() => api.listBuyerRequests(), [])
  const negotiations = useAsync(() => api.listBuyerNegotiations(), [])

  const set = (key: keyof Form) => (e: { target: { value: string } }) => {
    setForm({ ...form, [key]: e.target.value })
    setSaved(false)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    // The back end checks these rules too. Checking here just gives faster feedback.
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0 || submitting) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.createBuyerRequest({
        title: form.title.trim(),
        category: form.category,
        deliverables: form.deliverables.trim(),
        deadline: form.deadline,
        target: parsePrice(form.target) ?? 0,
        max: parsePrice(form.max) ?? 0,
      })
      setForm(emptyForm)
      setSaved(true)
      requests.reload()
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
    <div className="sd-content">
      <div className="sd-hero">
        <div className="sd-hero-text">
          <h1 className="sd-title">
            Buyer <span>Dashboard</span>
          </h1>
          <p className="sd-subtitle">Set your target and maximum price, then let your agent negotiate in up to 3 rounds.</p>
          <span className="sd-title-bar" aria-hidden="true" />
        </div>
        <Link to="/search" className="sd-history-btn">
          <SearchIcon size={20} />
          Find services
          <ArrowRightIcon size={15} />
        </Link>
        <BagArt />
      </div>

      <div className="sd-grid">
        <form className="sd-card sd-form" onSubmit={submit} noValidate aria-label="New request">
          <div className="sd-form-head">
            <span className="sd-form-badge" aria-hidden="true">
              <PlusIcon size={26} color="#fff" />
            </span>
            <div>
              <h2>New request</h2>
              <p>Tell sellers what you need.</p>
            </div>
          </div>

          <div className="field">
            <label htmlFor="req-title">What do you need?</label>
            <IconField icon={<DocIcon size={20} />}>
              <input id="req-title" className="input" type="text" placeholder="5-page business website" value={form.title} onChange={set('title')} {...err('title')} />
            </IconField>
            {errMsg('title')}
          </div>

          <div className="field">
            <label htmlFor="req-cat">Category</label>
            <IconField icon={<GlobeIcon size={20} />} chevron={<ChevronDownIcon size={18} />}>
              <select id="req-cat" className="input" value={form.category} onChange={set('category')}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </IconField>
          </div>

          <div className="field">
            <label htmlFor="req-deliv">Deliverables</label>
            <IconField icon={<PencilIcon size={20} />} top>
              <textarea id="req-deliv" className="input textarea" placeholder="5 pages, contact form, blog" value={form.deliverables} onChange={set('deliverables')} {...err('deliverables')} />
            </IconField>
            {errMsg('deliverables')}
          </div>

          <div className="field">
            <label htmlFor="req-deadline">Deadline</label>
            <IconField icon={<CalendarIcon size={20} />}>
              <input id="req-deadline" className="input" type="date" min={todayISO()} value={form.deadline} onChange={set('deadline')} {...err('deadline')} />
            </IconField>
            {errMsg('deadline')}
          </div>

          <div className="field">
            <label htmlFor="req-target">Target price (USD)</label>
            <IconField icon={<TargetIcon size={20} />}>
              <input id="req-target" className="input" type="text" inputMode="numeric" placeholder="Enter target price" value={form.target} onChange={set('target')} {...err('target')} />
            </IconField>
            {errMsg('target')}
          </div>

          <div className="field">
            <label htmlFor="req-max">Maximum price (USD)</label>
            <IconField icon={<DollarIcon size={20} />}>
              <input id="req-max" className="input" type="text" inputMode="numeric" placeholder="Enter maximum price" value={form.max} onChange={set('max')} {...err('max')} />
            </IconField>
            {errMsg('max')}
          </div>

          <div className="private-note">
            <LockIcon size={16} color="var(--color-primary)" />
            <span>Only you can see your target and maximum. The engine will not accept a price above your maximum.</span>
          </div>

          {saved && (
            <div className="notice notice-success" role="status">
              Request saved. <Link to="/search">Find a seller</Link> to start negotiating.
            </div>
          )}
          {submitError && (
            <div className="notice notice-danger" role="alert">
              Your request was not saved. {submitError}
            </div>
          )}

          <div className="sd-form-actions">
            <button type="submit" className="sd-create-btn" disabled={submitting}>
              <SendIcon size={20} />
              {submitting ? 'Saving...' : 'Save request'}
            </button>
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
                <p>Active, agreed and finished negotiations.</p>
              </div>
              <span className="sd-panel-note">Each lasts at most 3 rounds.</span>
            </header>
            <div className="sd-panel-body">
              {negotiations.error != null && <ErrorCard error={negotiations.error} onRetry={negotiations.reload} />}
              {negotiations.error == null && !negotiations.data && <LoadingCard label="Loading your negotiations..." />}
              {negotiations.error == null && negotiations.data?.length === 0 && (
                <p className="dash-empty">No negotiations yet. Search for a service to start one.</p>
              )}
              {negotiations.error == null && negotiations.data?.map((n) => <NegotiationRow key={n.id} n={n} />)}
            </div>
          </section>

          <section aria-label="My requests" className="sd-card sd-panel">
            <header className="sd-panel-head">
              <span className="sd-panel-icon" aria-hidden="true">
                <ClipboardIcon size={44} />
              </span>
              <div className="sd-panel-titles">
                <h2>My requests</h2>
                <p>Your target and maximum are private to you.</p>
              </div>
              {requests.data && (
                <span className="sd-panel-total">
                  Total: {requests.data.length} {requests.data.length === 1 ? 'request' : 'requests'}
                </span>
              )}
            </header>
            <div className="sd-panel-body">
              {requests.error != null && <ErrorCard error={requests.error} onRetry={requests.reload} />}
              {requests.error == null && !requests.data && <LoadingCard label="Loading your requests..." />}
              {requests.error == null && requests.data?.length === 0 && <p className="dash-empty">No requests yet.</p>}
              {requests.error == null &&
                requests.data?.map((r) => (
                  <div key={r.id} className="sd-listing sd-listing-static">
                    <div className="sd-thumb">
                      <RequestThumb />
                    </div>
                    <div className="sd-listing-main">
                      <div className="sd-tags">
                        <Badge tone="info">{r.category}</Badge>
                        <Badge tone="neutral">
                          <LockIcon size={12} />
                          Only you can see this
                        </Badge>
                      </div>
                      <h3 className="sd-listing-title">{r.title}</h3>
                      <p className="sd-listing-meta">
                        {r.deliverables} &bull; Deadline {r.deadline}
                      </p>
                    </div>
                    <div className="sd-listing-price">
                      <span>Target / max</span>
                      <strong className="sd-price-sm">
                        {usd(r.target)} / {usd(r.max)}
                      </strong>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

/** One negotiation in the buyer's list, with the right next step for where it stands. */
function NegotiationRow({ n }: { n: BuyerNegotiationRow }) {
  const path = `/negotiations/${encodeURIComponent(n.id)}`

  // The round picture on the left follows where the negotiation stands.
  let tone: 'active' | 'approved' | 'neutral' = 'neutral'
  let icon: ReactNode = <ClockIcon size={30} />
  if (n.status === 'active') {
    tone = 'active'
    icon = <ChatBubbleIcon size={30} />
  } else if (n.status === 'agreed') {
    tone = 'approved'
    icon = <CheckCircleIcon size={34} />
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
          {n.status === 'agreed' && <Badge tone="success">Agreed</Badge>}
          {n.status === 'no_agreement' && <Badge tone="neutral">No agreement</Badge>}
        </div>
        <h3 className="sd-row-title">{n.service}</h3>
        <p className="sd-row-meta">
          {n.sellerName} &bull; Your agent {usd(n.buyerOffer)}, seller agent {usd(n.sellerOffer)}
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
          <Link to={`${path}/pay`} className="sd-pill sd-pill-fill">
            Approve and pay
            <ArrowRightIcon size={16} />
          </Link>
        )}
        {n.status === 'no_agreement' && (
          <Link to={`${path}/no-agreement`} className="sd-pill sd-pill-outline">
            See what happened
            <ArrowRightIcon size={16} />
          </Link>
        )}
      </div>
    </div>
  )
}
