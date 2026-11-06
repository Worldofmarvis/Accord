import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../api'
import Badge from '../components/Badge'
import { ErrorCard, LoadingCard } from '../components/StateCards'
import { LockIcon } from '../components/icons'
import { useAsync } from '../hooks/useAsync'
import { categories } from '../lib/categories'
import { PRICE_ERROR, parsePrice, todayISO } from '../lib/forms'
import { usd } from '../lib/format'
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
    <div className="page-stack">
      <div>
        <h1>Buyer dashboard</h1>
        <p className="muted">Set your target and maximum price, then let your agent negotiate in up to 3 rounds.</p>
      </div>

      <div className="dash-layout">
        <form className="card dash-form" onSubmit={submit} noValidate aria-label="New request">
          <h2>New request</h2>

          <div className="field">
            <label htmlFor="req-title">What do you need?</label>
            <input id="req-title" className="input" type="text" placeholder="5-page business website" value={form.title} onChange={set('title')} {...err('title')} />
            {errMsg('title')}
          </div>

          <div className="field">
            <label htmlFor="req-cat">Category</label>
            <select id="req-cat" className="input" value={form.category} onChange={set('category')}>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="req-deliv">Deliverables</label>
            <textarea id="req-deliv" className="input textarea" placeholder="5 pages, contact form, blog" value={form.deliverables} onChange={set('deliverables')} {...err('deliverables')} />
            {errMsg('deliverables')}
          </div>

          <div className="field">
            <label htmlFor="req-deadline">Deadline</label>
            <input id="req-deadline" className="input" type="date" min={todayISO()} value={form.deadline} onChange={set('deadline')} {...err('deadline')} />
            {errMsg('deadline')}
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="req-target">Target price (USD)</label>
              <input id="req-target" className="input" type="text" inputMode="numeric" value={form.target} onChange={set('target')} {...err('target')} />
              {errMsg('target')}
            </div>
            <div className="field">
              <label htmlFor="req-max">Maximum price (USD)</label>
              <input id="req-max" className="input" type="text" inputMode="numeric" value={form.max} onChange={set('max')} {...err('max')} />
              {errMsg('max')}
            </div>
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

          <div className="dash-form-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save request'}
            </button>
          </div>
        </form>

        <div className="dash-list">
          <section aria-label="My negotiations" className="card">
            <h2 className="card-title">My negotiations</h2>
            <p className="muted small">Each negotiation lasts at most 3 rounds.</p>
            {negotiations.error != null && <ErrorCard error={negotiations.error} onRetry={negotiations.reload} />}
            {negotiations.error == null && !negotiations.data && <LoadingCard label="Loading your negotiations..." />}
            {negotiations.error == null && negotiations.data?.length === 0 && (
              <p className="dash-empty">No negotiations yet. Search for a service to start one.</p>
            )}
            {negotiations.error == null &&
              negotiations.data?.map((n) => {
                const path = `/negotiations/${encodeURIComponent(n.id)}`
                return (
                  <div key={n.id} className="dash-item">
                    <div className="dash-item-main">
                      <div className="dash-item-tags">
                        {n.status === 'active' && (
                          <Badge tone="info">
                            Active, round {n.round} of {n.maxRounds}
                          </Badge>
                        )}
                        {n.status === 'agreed' && <Badge tone="success">Agreed</Badge>}
                        {n.status === 'no_agreement' && <Badge tone="warning">No agreement</Badge>}
                      </div>
                      <h3 className="dash-item-title">{n.service}</h3>
                      <p className="dash-item-meta">{n.sellerName}</p>
                      <p className="dash-item-meta">
                        Your agent {usd(n.buyerOffer)}, seller agent {usd(n.sellerOffer)}
                      </p>
                    </div>
                    <div className="dash-item-side">
                      {n.status === 'active' && (
                        <Link to={path} className="btn btn-primary btn-lg">
                          Open negotiation
                        </Link>
                      )}
                      {n.status === 'agreed' && (
                        <Link to={`${path}/pay`} className="btn btn-primary btn-lg">
                          Approve and pay
                        </Link>
                      )}
                      {n.status === 'no_agreement' && (
                        <Link to={`${path}/no-agreement`} className="btn btn-secondary btn-lg">
                          See what happened
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
          </section>

          <section aria-label="My requests" className="card">
            <h2 className="card-title">My requests</h2>
            <p className="muted small">Your target and maximum are private to you.</p>
            {requests.error != null && <ErrorCard error={requests.error} onRetry={requests.reload} />}
            {requests.error == null && !requests.data && <LoadingCard label="Loading your requests..." />}
            {requests.error == null && requests.data?.length === 0 && <p className="dash-empty">No requests yet.</p>}
            {requests.error == null &&
              requests.data?.map((r) => (
                <div key={r.id} className="dash-item">
                  <div className="dash-item-main">
                    <div className="dash-item-tags">
                      <Badge tone="info">{r.category}</Badge>
                    </div>
                    <h3 className="dash-item-title">{r.title}</h3>
                    <p className="dash-item-meta">{r.deliverables}</p>
                    <p className="dash-item-meta">Deadline {r.deadline}</p>
                  </div>
                  <div className="dash-item-side">
                    <div className="dash-item-price">
                      <div className="muted caption">Target / max</div>
                      <div className="dash-item-amount">
                        {usd(r.target)} / {usd(r.max)}
                      </div>
                    </div>
                    <Badge tone="neutral">Only you can see this</Badge>
                  </div>
                </div>
              ))}
          </section>
        </div>
      </div>
    </div>
  )
}
