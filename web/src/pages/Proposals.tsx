import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, errorMessage, POLL_MS } from '../api'
import Badge from '../components/Badge'
import { ErrorCard, LoadingCard } from '../components/StateCards'
import { useAsync } from '../hooks/useAsync'
import { formatDate, usd } from '../lib/format'
import { useRole } from '../role/useRole'
import type { Proposal } from '../types/proposal'
import '../styles/dashboards.css'

const statusBadge = {
  pending: { tone: 'warning', label: 'Waiting for an answer' },
  accepted: { tone: 'success', label: 'Accepted' },
  declined: { tone: 'neutral', label: 'Declined' },
} as const

// Every negotiation starts here: the side that did not start it accepts or declines first.
export default function Proposals() {
  const { role } = useRole()
  const navigate = useNavigate()
  const proposals = useAsync(() => api.listProposals(), [role])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  // While a proposal you sent is waiting, look for the answer every few seconds.
  const reloadRef = useRef(proposals.reload)
  useEffect(() => {
    reloadRef.current = proposals.reload
  })
  const waiting = proposals.data?.some((p) => p.direction === 'outgoing' && p.status === 'pending') ?? false
  useEffect(() => {
    if (!waiting) return
    const timer = setInterval(() => {
      if (!document.hidden) reloadRef.current()
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [waiting])

  async function answer(p: Proposal, action: 'accept' | 'decline') {
    setBusyId(p.id)
    setProblem(null)
    try {
      if (action === 'accept') {
        const done = await api.acceptProposal(p.id)
        if (done.negotiationId) {
          navigate(`/negotiations/${encodeURIComponent(done.negotiationId)}`)
          return
        }
      } else {
        await api.declineProposal(p.id)
      }
      proposals.reload()
    } catch (e) {
      setProblem(errorMessage(e))
      proposals.reload()
    } finally {
      setBusyId(null)
    }
  }

  const list = proposals.data ?? []
  const needsAnswer = list.filter((p) => p.direction === 'incoming' && p.status === 'pending')
  const rest = list.filter((p) => !needsAnswer.includes(p))

  const row = (p: Proposal) => {
    const buyer = role === 'buyer'
    const counterpart = buyer ? p.listing.sellerName : p.request.buyerName
    const badge = statusBadge[p.status]
    return (
      <div key={p.id} className="dash-item">
        <div className="dash-item-main">
          <div className="dash-item-tags">
            <Badge tone="neutral">{p.direction === 'incoming' ? 'Received' : 'Sent'}</Badge>
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </div>
          <h3 className="dash-item-title">{buyer ? p.listing.title : p.request.title}</h3>
          <p className="dash-item-meta">
            {counterpart}
            {buyer ? ` · list price ${usd(p.listing.listPrice)}` : ` · needed by ${formatDate(p.request.deadline)}`}
          </p>
          <p className="dash-item-meta">
            {buyer
              ? `For your request: ${p.request.title}`
              : `With your listing: ${p.listing.title} (${usd(p.listing.listPrice)})`}
          </p>
        </div>
        <div className="dash-item-side">
          {p.status === 'pending' && p.direction === 'incoming' && (
            <>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                disabled={busyId === p.id}
                onClick={() => void answer(p, 'accept')}
              >
                {busyId === p.id ? 'Working...' : 'Accept'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                disabled={busyId === p.id}
                onClick={() => void answer(p, 'decline')}
              >
                Decline
              </button>
            </>
          )}
          {p.status === 'pending' && p.direction === 'outgoing' && (
            <p className="muted small">Waiting for {counterpart} to answer</p>
          )}
          {p.status === 'accepted' && p.negotiationId && (
            <Link to={`/negotiations/${encodeURIComponent(p.negotiationId)}`} className="btn btn-primary btn-lg">
              Open negotiation
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <div>
        <h1>Proposals</h1>
        <p className="muted">
          A negotiation starts only after the other side accepts. Accepting locks the seller's listing, so it can
          have one negotiation at a time.
        </p>
      </div>

      {problem && (
        <div className="notice notice-danger" role="alert">
          {problem}
        </div>
      )}

      {proposals.error != null && !proposals.data && <ErrorCard error={proposals.error} onRetry={proposals.reload} />}
      {proposals.error == null && !proposals.data && <LoadingCard label="Loading your proposals..." />}

      {proposals.data && (
        <>
          <section aria-label="Waiting for your answer" className="card">
            <h2 className="card-title">Waiting for your answer</h2>
            {needsAnswer.length === 0 ? (
              <p className="dash-empty">Nothing is waiting for you.</p>
            ) : (
              needsAnswer.map(row)
            )}
          </section>

          <section aria-label="All proposals" className="card">
            <h2 className="card-title">All proposals</h2>
            {rest.length === 0 ? (
              <p className="dash-empty">
                No other proposals yet. Press "Negotiate" on a search result to send one.
              </p>
            ) : (
              rest.map(row)
            )}
          </section>
        </>
      )}
    </div>
  )
}
