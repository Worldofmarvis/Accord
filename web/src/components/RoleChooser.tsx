import type { ReactNode } from 'react'
import type { Me, Role } from '../types/me'
import AccordMark from './AccordMark'

type Props = {
  me: Me
  onChoose: (role: Role) => void
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const SIDES: {
  role: Role
  title: string
  tagline: string
  points: string[]
  icon: ReactNode
  badge: ReactNode
}[] = [
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
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="7.5" r="4.2" />
        <path d="M3.5 21c0-4.6 3.8-7.4 8.5-7.4s8.5 2.8 8.5 7.4z" />
      </svg>
    ),
    badge: (
      <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
        <path d="M2.5 4h2.6l2.3 10.4a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.7L20 8H6" />
        <circle cx="9.5" cy="19.2" r="1.2" />
        <circle cx="17" cy="19.2" r="1.2" />
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
      <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.8} aria-hidden="true">
        <path d="M3.5 9.5 5 4h14l1.5 5.5" />
        <path d="M3.5 9.5c0 1.7 1.3 2.8 2.9 2.8s2.8-1.1 2.8-2.8c0 1.7 1.3 2.8 2.8 2.8s2.8-1.1 2.8-2.8c0 1.7 1.2 2.8 2.8 2.8s2.9-1.1 2.9-2.8" />
        <path d="M5 12.8V20h14v-7.2" />
        <path d="M9.8 20v-4.5h4.4V20" />
      </svg>
    ),
    badge: (
      <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
        <path d="M3 12.2V4a1 1 0 0 1 1-1h8.2a1 1 0 0 1 .7.3l7.8 7.8a1 1 0 0 1 0 1.4l-7.2 7.2a1 1 0 0 1-1.4 0L3.3 12.9a1 1 0 0 1-.3-.7Z" />
        <circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
]

const FEATURES: { title: string; text: string; icon: ReactNode }[] = [
  {
    title: 'Safe & Secure',
    text: 'Your price limits stay private',
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
        <path d="M12 3 20 6v6c0 5-3.4 8.4-8 9.5C7.4 20.4 4 17 4 12V6z" />
        <path d="m8.6 12.2 2.4 2.4 4.4-4.8" />
      </svg>
    ),
  },
  {
    title: 'Pay with PayPal',
    text: 'Checkout runs in the sandbox',
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="M3 10h18M7 15h4" />
      </svg>
    ),
  },
  {
    title: 'Fast & Easy',
    text: 'Agents settle in up to 3 rounds',
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
        <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z" />
      </svg>
    ),
  },
  {
    title: 'Fair for both',
    text: 'Both sides approve before payment',
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12.3 2.8 2.8L16.2 9.5" />
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
      <svg className="role-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="rcWaveA" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#0a5be0" stopOpacity="0.9" />
            <stop offset="1" stopColor="#0033c9" stopOpacity="0.95" />
          </linearGradient>
        </defs>
        <path d="M1600 0v520C1500 380 1330 190 1080 0z" fill="#2f8dff" fillOpacity="0.2" />
        <path d="M1600 120v440c-90-130-230-270-420-440z" fill="#0a5be0" fillOpacity="0.18" />
        <path d="M0 690c260-70 470 90 820 90V900H0z" fill="#2f8dff" fillOpacity="0.22" />
        <path d="M0 790c340-70 640 100 1030 40 220-34 400-60 570-20V900H0z" fill="url(#rcWaveA)" />
        <path d="M1060 760c260-30 480-130 560-260" stroke="#fff" strokeOpacity="0.7" strokeWidth="3" fill="none" />
      </svg>

      <div className="role-choose-inner">
        <div className="role-choose-brand">
          <AccordMark size={56} />
          <span>Accord</span>
        </div>
        <h1>
          <span className="welcome-word">Welcome,</span> {firstName}
        </h1>
        <p className="role-choose-lead">
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
                <span className="role-card-icon">
                  {s.icon}
                  <span className="role-card-badge">{s.badge}</span>
                </span>
                <h2 id={`role-${s.role}-title`}>{s.title}</h2>
                <p className="role-card-tagline">{s.tagline}</p>
                <ul>
                  {s.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <button type="button" className="btn role-card-btn" disabled={!available} onClick={() => onChoose(s.role)}>
                  Continue as {s.role}
                  <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.5} aria-hidden="true">
                    <path d="m9 5 7 7-7 7" />
                  </svg>
                </button>
                {!available && <p className="caption role-card-note">This account is not set up as a {s.role}.</p>}
              </section>
            )
          })}
          <span className="role-split-swap" aria-hidden="true">
            <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.5}>
              <path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4" />
            </svg>
          </span>
        </div>
      </div>

      <div className="role-features-bar">
        <ul className="role-features">
          {FEATURES.map((f) => (
            <li key={f.title}>
              <span className="role-feature-icon">{f.icon}</span>
              <span>
                <strong>{f.title}</strong>
                {f.text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
