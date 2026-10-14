import { Link, useParams } from 'react-router-dom'
import { errorMessage } from '../api'
import { isFinalError } from '../api/errors'
import Badge from '../components/Badge'
import PayPalCheckout from '../components/PayPalCheckout'
import { ErrorCard, LoadingCard } from '../components/StateCards'
import { useApproval } from '../hooks/useApproval'
import { useNegotiation } from '../hooks/useNegotiation'
import { usePayment } from '../hooks/usePayment'
import { usd } from '../lib/format'
import type { Decision, Role } from '../types/marketplace'

const decisionBadge: Record<Decision, { tone: 'neutral' | 'success' | 'warning'; label: string }> = {
  pending: { tone: 'neutral', label: 'Waiting for approval' },
  approved: { tone: 'success', label: 'Approved' },
  declined: { tone: 'warning', label: 'Declined' },
}

export default function Payment() {
  const { id = '' } = useParams()
  // Keyed by id so moving to another negotiation starts from a clean state.
  return <ApproveAndPay key={id} id={id} />
}

function ApproveAndPay({ id }: { id: string }) {
  const { negotiation: n, error, loading, retry } = useNegotiation(id)
  const agreed = n?.status === 'agreed'
  const deal = useApproval(id, agreed)
  // Payment is only looked up once both sides approved.
  const pay = usePayment(id, deal.approval?.status === 'approved')

  if (!n) {
    return (
      <div className="page-stack">
        {loading ? <LoadingCard label="Loading the agreed price..." /> : <ErrorCard error={error} onRetry={retry} />}
      </div>
    )
  }

  if (n.status !== 'agreed') {
    const back = n.viewerRole === 'buyer' ? '/buyer' : '/seller'
    return (
      <div className="page-stack">
        <section aria-label="Not ready" className="card">
          <h1>{n.status === 'active' ? 'No agreed price yet' : 'No agreement was reached'}</h1>
          <p>
            {n.status === 'active'
              ? 'The agents are still negotiating. You can approve a price once they agree on one.'
              : 'Nothing was agreed, so there is nothing to approve or pay.'}
          </p>
          <Link
            to={n.status === 'active' ? `/negotiations/${encodeURIComponent(id)}` : back}
            className="btn btn-secondary btn-lg"
          >
            {n.status === 'active' ? 'Back to the negotiation' : 'Back to my dashboard'}
          </Link>
        </section>
      </div>
    )
  }

  const { approval } = deal
  if (!approval) {
    return (
      <div className="page-stack">
        {deal.loading ? (
          <LoadingCard label="Loading the approvals..." />
        ) : (
          <ErrorCard error={deal.error} onRetry={deal.retry} />
        )}
      </div>
    )
  }

  const viewer: Role = n.viewerRole
  const other: Role = viewer === 'buyer' ? 'seller' : 'buyer'
  const mine = approval[viewer]
  const theirs = approval[other]
  const price = approval.agreedPrice
  const dashboard = viewer === 'buyer' ? '/buyer' : '/seller'
  const unlocked = approval.status === 'approved'
  const declined = approval.status === 'declined'
  const rows: { role: Role; name: string; decision: Decision }[] = [
    { role: 'buyer', name: viewer === 'buyer' ? 'You (buyer)' : `${n.counterpartName} (buyer)`, decision: approval.buyer },
    { role: 'seller', name: viewer === 'seller' ? 'You (seller)' : `${n.counterpartName} (seller)`, decision: approval.seller },
  ]

  return (
    <div className="page-stack">
      <section aria-label="Agreed price" className="card">
        <h1>Approve the agreed price</h1>
        <p className="muted">
          {n.service} with {n.counterpartName}
        </p>
        <p className="approval-price">{usd(price)}</p>
        <p className="muted caption">
          The agents settled on this price. Payment opens only after the buyer and the seller both approve it.
        </p>
      </section>

      {deal.error != null && !isFinalError(deal.error) && (
        <div className="notice notice-warning notice-inline" role="status">
          We can&apos;t reach the server right now. You&apos;re seeing the last update, and we&apos;ll keep trying.
        </div>
      )}

      <section aria-label="Approvals" className="card">
        <h2 className="card-title">Approvals</h2>
        <ul className="approval-list">
          {rows.map((r) => (
            <li key={r.role} className="approval-row">
              <span>{r.name}</span>
              <Badge tone={decisionBadge[r.decision].tone}>{decisionBadge[r.decision].label}</Badge>
            </li>
          ))}
        </ul>

        {declined ? (
          <div className="notice notice-danger" role="status">
            {approval[viewer] === 'declined' ? 'You declined this deal.' : `${n.counterpartName} declined this deal.`}{' '}
            Nothing was charged.
          </div>
        ) : mine === 'pending' ? (
          <>
            <p>
              {theirs === 'approved'
                ? `${n.counterpartName} already approved ${usd(price)}. Your approval is the last step.`
                : `Approve ${usd(price)} to move on. ${n.counterpartName} also has to approve before anyone can pay.`}
            </p>
            <div className="approval-actions">
              <button type="button" className="btn btn-primary btn-lg" onClick={deal.approve} disabled={deal.busy}>
                Approve {usd(price)}
              </button>
              <button type="button" className="btn btn-secondary btn-lg" onClick={deal.decline} disabled={deal.busy}>
                Decline
              </button>
            </div>
          </>
        ) : !unlocked ? (
          <div className="notice notice-warning" role="status">
            You approved {usd(price)}. Waiting for {n.counterpartName} to approve. Payment stays locked until they do.
          </div>
        ) : (
          <div className="notice notice-success" role="status">
            Both sides approved {usd(price)}.
          </div>
        )}

        {deal.actionError != null && (
          <div className="notice notice-danger notice-inline" role="alert">
            {errorMessage(deal.actionError)}
          </div>
        )}
      </section>

      {!declined && (
        <section aria-label="Payment" className="card">
          <h2 className="card-title">Payment</h2>
          {pay.payment?.status === 'paid' ? (
            <>
              <div className="notice notice-success" role="status">
                {viewer === 'buyer'
                  ? `Payment complete. You paid ${usd(pay.payment.amount)} with the PayPal sandbox.`
                  : `Payment complete. ${n.counterpartName} paid ${usd(pay.payment.amount)} with the PayPal sandbox.`}
              </div>
              {pay.payment.orderId && <p className="muted caption">PayPal order {pay.payment.orderId}</p>}
            </>
          ) : viewer === 'seller' ? (
            <p className="muted">
              {unlocked
                ? 'Both sides approved. The buyer pays with the PayPal sandbox. This page updates when the payment arrives.'
                : 'The buyer pays after both of you approve. Nothing is charged before then.'}
            </p>
          ) : unlocked ? (
            <>
              <p className="muted">Both sides approved. Pay {usd(price)} with the PayPal sandbox.</p>
              <PayPalCheckout negotiationId={id} amount={price} onPaid={pay.setPaid} />
            </>
          ) : (
            <>
              <p className="muted">
                Locked until both you and the seller approve the price. Nothing is charged before then.
              </p>
              <button type="button" className="btn btn-primary btn-lg" disabled aria-disabled="true">
                Payment locked
              </button>
            </>
          )}
          {pay.error != null && !isFinalError(pay.error) && pay.payment?.status !== 'paid' && (
            <div className="notice notice-warning notice-inline" role="status">
              We can&apos;t check the payment status right now. We&apos;ll keep trying.
            </div>
          )}
        </section>
      )}

      <Link to={dashboard} className="muted">
        Back to my dashboard
      </Link>
    </div>
  )
}
