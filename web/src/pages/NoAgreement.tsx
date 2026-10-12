import { Link, useNavigate, useParams } from 'react-router-dom'
import Badge from '../components/Badge'
import { CloseIcon } from '../components/icons'
import { DEMO_NEGOTIATION_ID, getEndedSession } from '../data/mock'
import { usd } from '../lib/format'

const matchLabels = ['Best match', '2nd match', '3rd match']

export default function NoAgreement() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  // TODO: load from the API. `rematches` should come back already ranked.
  const s = getEndedSession(id)
  const last = s.rounds[s.rounds.length - 1]

  const reasons = [
    {
      title: 'The 3-round limit was reached',
      body: 'Every negotiation stops after 3 rounds, so this one closed automatically.',
    },
    {
      title: 'The final offers did not meet',
      body: 'Each agent made its best offer in Round 3.',
      extra: (
        <div className="ended-offers">
          <div className="ended-offer ended-offer-buyer">
            <div className="muted caption">Your last offer</div>
            <div className="ended-offer-amount">{usd(last.buyer)}</div>
          </div>
          <div className="ended-offer ended-offer-seller">
            <div className="muted caption">Seller's last offer</div>
            <div className="ended-offer-amount">{usd(last.seller)}</div>
          </div>
          <div className="ended-offer ended-offer-gap">
            <div className="muted caption">Gap</div>
            <div className="ended-offer-amount">{usd(last.seller - last.buyer)}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Your maximum price is below what this seller accepts',
      body: 'No price fits both sides, so the engine could not close a deal. Exact limits stay private for both of you.',
    },
  ]

  return (
    <div className="page-stack">
      <section aria-label="Session ended" className="ended-banner">
        <div className="ended-icon">
          <CloseIcon color="var(--color-primary-contrast)" />
        </div>
        <div className="ended-banner-text">
          <h1>No agreement after {s.rounds.length} rounds</h1>
          <p>This negotiation has ended and nothing was charged. The seller can now take other buyers.</p>
        </div>
        <div className="ended-service">
          <div className="muted caption">Service</div>
          <div className="ended-service-title">{s.service}</div>
          <div className="muted small">{s.sellerName}</div>
        </div>
      </section>

      <div className="ended-layout">
        <div className="ended-left">
          <section aria-label="Why it ended" className="card">
            <h2 className="card-title">Why it ended</h2>
            {reasons.map((r, i) => (
              <div key={r.title} className="reason-row">
                <div className="reason-num">{i + 1}</div>
                <div className="reason-body">
                  <div className="reason-title">{r.title}</div>
                  <p className="muted small">{r.body}</p>
                  {r.extra}
                </div>
              </div>
            ))}
          </section>

          <section aria-label="Offers by round" className="card">
            <h2 className="card-title">Offers by round</h2>
            <table className="rounds-table">
              <thead>
                <tr>
                  <th scope="col">Round</th>
                  <th scope="col">Your agent</th>
                  <th scope="col">Seller agent</th>
                </tr>
              </thead>
              <tbody>
                {s.rounds.map((r) => {
                  const final = r.round === last.round
                  return (
                    <tr key={r.round} className={final ? 'is-final' : undefined}>
                      <th scope="row">Round {r.round}{final && ' (final)'}</th>
                      <td>{usd(r.buyer)}</td>
                      <td>{usd(r.seller)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        </div>

        <section aria-label="Rematch suggestions" className="ended-right">
          <div>
            <h2>We found {s.rematches.length} other sellers</h2>
            <p className="muted small">Ranked by how well they match your request. Start one with a single click.</p>
          </div>

          {s.rematches.map((m, i) => (
            <article key={m.listingId} className="card rematch-card">
              <div className="rematch-head">
                <div>
                  <Badge tone={i === 0 ? 'primary' : 'neutral'}>{matchLabels[i] ?? `${i + 1}th match`}</Badge>
                  <h3>{m.title}</h3>
                  <div className="muted small">{m.sellerName}</div>
                </div>
                <div className="rematch-price">
                  <div className="muted caption">List price</div>
                  <div className="rematch-amount">{usd(m.listPrice)}</div>
                </div>
              </div>
              <ul className="rematch-reasons">
                {m.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              {/* TODO: create the negotiation through the API and use the id it returns. */}
              <button
                type="button"
                className={`btn btn-lg ${i === 0 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => navigate(`/negotiations/${DEMO_NEGOTIATION_ID}`)}
              >
                Start negotiation
              </button>
            </article>
          ))}

          <p className="muted caption">The system checks price fit behind the scenes. Nobody's limits are shown.</p>
        </section>
      </div>

      <div className="ended-actions">
        <Link to="/search" className="btn btn-secondary btn-lg">
          Back to search
        </Link>
        <Link to="/buyer" className="btn btn-secondary btn-lg">
          Edit my request
        </Link>
      </div>
    </div>
  )
}
