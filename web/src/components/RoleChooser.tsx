import type { Me, Role } from '../types/me'

type Props = {
  me: Me
  onChoose: (role: Role) => void
}

const SIDES: { role: Role; title: string; tagline: string; points: string[] }[] = [
  {
    role: 'buyer',
    title: "I'm a buyer",
    tagline: 'I need a service done.',
    points: [
      'Search seller listings by keyword, category and price',
      'Post a request with your target and maximum price',
      'Your agent negotiates for you in up to 3 rounds',
    ],
  },
  {
    role: 'seller',
    title: "I'm a seller",
    tagline: 'I offer a service.',
    points: [
      'List your services with a price floor only you can see',
      'Find buyer requests that fit what you do',
      'Your agent negotiates for you in up to 3 rounds',
    ],
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
        <p className="role-choose-brand">Agent Negotiation Marketplace</p>
        <h1>Welcome, {firstName}</h1>
        <p className="muted role-choose-lead">
          How do you want to use the marketplace today? You can switch sides later from the menu.
        </p>

        <div className="role-cards">
          {SIDES.map((s) => {
            const available = me.roles.includes(s.role)
            return (
              <section
                key={s.role}
                className={`role-card role-card-${s.role}${available ? '' : ' is-unavailable'}`}
                aria-labelledby={`role-${s.role}-title`}
              >
                <h2 id={`role-${s.role}-title`}>{s.title}</h2>
                <p className="role-card-tagline">{s.tagline}</p>
                <ul>
                  {s.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <button type="button" className="btn btn-primary btn-lg" disabled={!available} onClick={() => onChoose(s.role)}>
                  Continue as {s.role}
                </button>
                {!available && <p className="muted caption">This account is not set up as a {s.role}.</p>}
              </section>
            )
          })}
        </div>

        <p className="muted caption">Your price limits stay private. The other side never sees them.</p>
      </div>
    </main>
  )
}
