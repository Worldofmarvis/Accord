import type { ReactNode } from 'react'
import type { Me, Role } from '../types/me'
import AccordMark from './AccordMark'

type Props = {
  me: Me
  onChoose: (role: Role) => void
}

const SIDES: { role: Role; title: string; tagline: string; points: string[]; icon: ReactNode }[] = [
  {
    role: 'buyer',
    title: "I'm a buyer",
    tagline: 'I need a service done.',
    points: [
      'Search seller listings by keyword, category and price',
      'Post a request with your target and maximum price',
      'Your agent negotiates the price for you',
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 5 5" />
      </svg>
    ),
  },
  {
    role: 'seller',
    title: "I'm a seller",
    tagline: 'I offer a service.',
    points: [
      'List your services with a price floor only you can see',
      'Find buyer requests that fit what you do',
      'Your agent negotiates the price for you',
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 12.2V4a1 1 0 0 1 1-1h8.2a1 1 0 0 1 .7.3l7.8 7.8a1 1 0 0 1 0 1.4l-7.2 7.2a1 1 0 0 1-1.4 0L3.3 12.9a1 1 0 0 1-.3-.7Z" />
        <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
]

/**
 * The first screen: the person says whether they are here to buy or to sell. Each side then gets
 * its own menu, start page and colors. An account that has only one side cannot pick the other.
 */
export default function RoleChooser({ me, onChoose }: Props) {
  const firstName = me.name.split(' ')[0]

  return (
    <main className="role-choose">
      <div className="role-choose-inner">
        <div className="role-choose-brand">
          <AccordMark size={40} />
          <span>Accord</span>
        </div>
        <h1>Welcome, {firstName}</h1>
        <p className="muted role-choose-lead">
          Choose how you want to use Accord today. You can switch sides later from the menu.
        </p>

        <div className="role-split">
          {SIDES.map((s) => {
            const available = me.roles.includes(s.role)
            return (
              <section
                key={s.role}
                className={`role-card role-card-${s.role}${available ? '' : ' is-unavailable'}`}
                aria-labelledby={`role-${s.role}-title`}
              >
                <span className="role-card-icon">{s.icon}</span>
                <h2 id={`role-${s.role}-title`}>{s.title}</h2>
                <p className="role-card-tagline">{s.tagline}</p>
                <ul>
                  {s.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <button type="button" className="btn btn-lg role-card-btn" disabled={!available} onClick={() => onChoose(s.role)}>
                  Continue as {s.role}
                </button>
                {!available && <p className="caption role-card-note">This account is not set up as a {s.role}.</p>}
              </section>
            )
          })}
          <span className="role-split-mark" aria-hidden="true">
            <AccordMark size={44} />
          </span>
        </div>

        <ul className="role-assurances">
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Your price limits stay private. The other side never sees them.
          </li>
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <path d="M21 4v5h-5" />
            </svg>
            Agents negotiate in up to 3 rounds, then the session ends.
          </li>
        </ul>
      </div>
    </main>
  )
}
