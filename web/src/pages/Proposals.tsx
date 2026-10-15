import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, errorMessage, POLL_MS } from '../api'
import Badge from '../components/Badge'
import { ErrorCard, LoadingCard } from '../components/StateCards'
import { useAsync } from '../hooks/useAsync'
import { refreshIncomingProposals } from '../hooks/useIncomingProposals'
import { formatDate, usd } from '../lib/format'
import { useRole } from '../role/useRole'
import type { Proposal } from '../types/proposal'
import '../styles/dashboards.css'

const statusBadge = {
  pending: { tone: 'warning', label: 'Waiting for an answer' },
  accepted: { tone: 'success', label: 'Accepted' },
  declined: { tone: 'neutral', label: 'Declined' },
  withdrawn: { tone: 'neutral', label: 'Withdrawn' },
} as const

/** The label for a proposal. One the server closed by itself says why, so it isn't mistaken for a person's answer. */
function badgeFor(p: Proposal): { tone: 'warning' | 'success' | 'neutral'; label: string } {
  if (p.status === 'declined' && p.closedReason === 'taken') {
    return { tone: 'neutral', label: 'Closed: already in another negotiation' }
  }
  return statusBadge[p.status]
}

// Every negotiation starts here: the side that did not start it accepts or declines first.
// A person who is both buyer and seller only sees the proposals of the side they are viewing.
export default function Proposals() {
  const { role } = useRole()
  const navigate = useNavigate()
  const proposals = useAsync(() => api.listProposals(role), [role])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  // While this page is open, look for new proposals and for answers to yours every few seconds.
  const reloadRef = useRef(proposals.reload)
  useEffect(() => {
    reloadRef.current = proposals.reload
  })
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) reloadRef.current()
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [])

  async function answer(p: Proposal, action: 'accept' | 'decline' | 'withdraw') {
    setBusyId(p.id)
    setProblem(null)
    try {
      if (action === 'accept') {
        const done = await api.acceptProposal(p.id)
        if (done.negotiationId) {
          navigate(`/negotiations/${encodeURIComponent(done.negotiationId)}`)
          return
        }
      } else if (action === 'decline') {
        await api.declineProposal(p.id)
      } else {
        await api.withdrawProposal(p.id)
      }
      proposals.reload()
    } catch (e) {
      setProblem(errorMessage(e))
      proposals.reload()
    } finally {
      setBusyId(null)
      refreshIncomingProposals()
    }
  }

  const list = proposals.data ?? []
  const needsAnswer = list.filter((p) => p.direction === 'incoming' && p.status === 'pending')
  const rest = list.filter((p) => !needsAnswer.includes(p))

  // Keep the number on the Proposals link in step with this list.
  const waitingCount = proposals.data ? needsAnswer.length : null
  useEffect(() => {
    if (waitingCount !== null) refreshIncomingProposals()
  }, [waitingCount])

  const row = (p: Proposal) => {
    const buyer = role === 'buyer'
    const counterpart = buyer ? p.listing.sellerName : p.request.buyerName
    const badge = badgeFor(p)
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
            <>
              <p className="muted small">Waiting for {counterpart} to answer</p>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                disabled={busyId === p.id}
                onClick={() => void answer(p, 'withdraw')}
              >
                Withdraw
              </button>
            </>
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
          A negotiation starts only after the other side accepts. Accepting locks the seller's listing and the
          buyer's request, so each is in one negotiation at a time, and every other proposal waiting for either
          of them is closed automatically. You can withdraw a proposal you sent until it is answered.
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
