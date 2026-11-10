import { listDemoUsers, type DemoUser } from '../api/demoUsers'
import { setUserId } from '../api/session'
import { useAsync } from '../hooks/useAsync'
import type { Role } from '../types/me'
import { ErrorCard, LoadingCard } from './StateCards'
import '../styles/demo-login.css'

const COPY: Record<Role, { tagline: string; points: string[]; cta: string }> = {
  buyer: {
    tagline: 'I need a service done.',
    points: ['Search seller listings by keyword, category and price', 'Post a request with your target and maximum price'],
    cta: 'Continue as buyer',
  },
  seller: {
    tagline: 'I offer a service.',
    points: ['List your services with a price floor only you can see', 'Find buyer requests that fit what you do'],
    cta: 'Continue as seller',
  },
}

const order = (r: Role) => (r === 'buyer' ? 0 : 1)

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/**
 * Demo sign-in. The back end has no login yet: it trusts an X-User-Id header, so the person
 * just picks who they are. The choice belongs to this browser tab only (see api/session.ts).
 */
export default function DemoLogin({ onChosen }: { onChosen: () => void }) {
  const users = useAsync(listDemoUsers, [])
  const list: DemoUser[] = users.data ? [...users.data].sort((a, b) => order(a.role) - order(b.role)) : []

  return (
    <main className="dl-page">
      <div className="dl-brand">
        <svg viewBox="0 0 64 40" width="52" height="33" aria-hidden="true">
          <circle cx="24" cy="20" r="16" fill="#2c7bff" />
          <circle cx="40" cy="20" r="16" fill="#ffffff" fillOpacity="0.95" />
        </svg>
        <span>Accord</span>
      </div>

      <section className="dl-card" aria-labelledby="dl-title">
        <span className="dl-eyebrow">Demo sign-in</span>
        <h1 id="dl-title">Welcome. Who are you today?</h1>
        <p className="dl-lead">
          Pick a side to try the marketplace. Your AI agent negotiates the price in up to 3 rounds, and your price
          limits stay private.
        </p>

        {users.error != null && !users.data ? (
          <ErrorCard error={users.error} onRetry={users.reload} />
        ) : !users.data ? (
          <LoadingCard label="Loading demo users..." />
        ) : list.length === 0 ? (
          <p className="dl-empty">No demo users found. Check that the back end is running.</p>
        ) : (
          <ul className="dl-grid">
            {list.map((u) => {
              const c = COPY[u.role]
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    className={`dl-choice dl-${u.role}`}
                    onClick={() => {
                      setUserId(u.id)
                      onChosen()
                    }}
                  >
                    <span className="dl-top">
                      <span className="dl-avatar" aria-hidden="true">
                        {initials(u.name)}
                      </span>
                      <span className="dl-role">{u.role}</span>
                    </span>
                    <span className="dl-name">{u.name}</span>
                    <span className="dl-tagline">{c.tagline}</span>
                    <span className="dl-points">
                      {c.points.map((p) => (
                        <span className="dl-point" key={p}>
                          {p}
                        </span>
                      ))}
                    </span>
                    <span className="dl-cta">
                      {c.cta}
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <p className="dl-note">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6l8-3z" fill="#19c28a" />
            <path d="M8.3 12.2l2.7 2.7 4.9-5.4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sandbox demo. No real money moves. Open a second tab to be a buyer and a seller at the same time.
        </p>
      </section>
    </main>
  )
}
