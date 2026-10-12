import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Badge from '../components/Badge'
import { LockIcon } from '../components/icons'
import { categories, DEMO_NEGOTIATION_ID } from '../data/mock'
import { buyerNegotiations, initialBuyerRequests } from '../data/dashboardMock'
import { parsePrice, todayISO } from '../lib/forms'
import { usd } from '../lib/format'
import type { BuyerRequest } from '../types/dashboard'
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
  if (target === null) e.target = 'Enter a price above 0.'
  if (max === null) e.max = 'Enter a price above 0.'
  if (target !== null && max !== null && max < target) e.max = 'Your maximum must be at least your target.'
  return e
}

export default function BuyerDashboard() {
  const [form, setForm] = useState<Form>(emptyForm)
  const [errors, setErrors] = useState<Errors>({})
  const [requests, setRequests] = useState<BuyerRequest[]>(initialBuyerRequests)
  const [saved, setSaved] = useState(false)

  const set = (key: keyof Form) => (e: { target: { value: string } }) => {
    setForm({ ...form, [key]: e.target.value })
    setSaved(false)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    // TODO: send to the API.
    setRequests([
      {
        id: `r-${Date.now()}`,
        title: form.title.trim(),
        category: form.category,
        deliverables: form.deliverables.trim(),
        deadline: form.deadline,
        target: parsePrice(form.target) ?? 0,
        max: parsePrice(form.max) ?? 0,
      },
      ...requests,
    ])
    setForm(emptyForm)
    setSaved(true)
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

          <div className="dash-form-actions">
            <button type="submit" className="btn btn-primary btn-lg">
              Save request
            </button>
          </div>
        </form>

        <div className="dash-list">
          <section aria-label="My negotiations" className="card">
            <h2 className="card-title">My negotiations</h2>
            <p className="muted small">Each negotiation lasts at most 3 rounds.</p>
            {buyerNegotiations.map((n) => (
              <div key={n.id} className="dash-item">
                <div className="dash-item-main">
                  <div className="dash-item-tags">
                    {n.status === 'active' ? (
                      <Badge tone="info">
                        Active, round {n.round} of {n.maxRounds}
                      </Badge>
                    ) : (
                      <Badge tone="warning">No agreement</Badge>
                    )}
                  </div>
                  <h3 className="dash-item-title">{n.service}</h3>
                  <p className="dash-item-meta">{n.sellerName}</p>
                  <p className="dash-item-meta">
                    Your agent {usd(n.buyerOffer)}, seller agent {usd(n.sellerOffer)}
                  </p>
                </div>
                <div className="dash-item-side">
                  {/* TODO: link to the real negotiation id from the API. */}
                  {n.status === 'active' ? (
                    <Link to={`/negotiations/${DEMO_NEGOTIATION_ID}`} className="btn btn-primary btn-lg">
                      Open negotiation
                    </Link>
                  ) : (
                    <Link to={`/negotiations/${DEMO_NEGOTIATION_ID}/no-agreement`} className="btn btn-secondary btn-lg">
                      See what happened
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </section>

          <section aria-label="My requests" className="card">
            <h2 className="card-title">My requests</h2>
            <p className="muted small">Your target and maximum are private to you.</p>
            {requests.length === 0 && <p className="dash-empty">No requests yet.</p>}
            {requests.map((r) => (
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
