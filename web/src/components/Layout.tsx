import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { USE_MOCK } from '../api'
import { useIncomingProposals } from '../hooks/useIncomingProposals'
import { useRole } from '../role/useRole'
import type { Role } from '../types/me'

const sideLabel: Record<Role, string> = { buyer: 'Buyer', seller: 'Seller' }

export default function Layout() {
  const { me, role, setRole } = useRole()
  const navigate = useNavigate()
  const canSwitch = me.roles.length > 1
  const incoming = useIncomingProposals(role)

  // The menu only shows the dashboard for the side the person is viewing.
  const links: { to: string; label: string; count?: number }[] = [
    { to: '/search', label: 'Search' },
    role === 'buyer'
      ? { to: '/buyer', label: 'Buyer dashboard' }
      : { to: '/seller', label: 'Seller dashboard' },
    { to: '/proposals', label: 'Proposals', count: incoming },
  ]

  function switchTo(next: Role) {
    if (next === role) return
    setRole(next)
    navigate(next === 'buyer' ? '/buyer' : '/seller')
  }

  return (
    <div className="shell">
      <header className="shell-header">
        <Link to="/" className="brand">
          Agent Negotiation Marketplace
        </Link>
        <nav className="shell-nav" aria-label="Main">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              aria-label={l.count ? `${l.label}, ${l.count} waiting for your answer` : undefined}
            >
              {l.label}
              {l.count ? (
                <span className="nav-count" aria-hidden="true">
                  {l.count > 9 ? '9+' : l.count}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div className="role-area">
          {canSwitch ? (
            <div className="role-switch" role="group" aria-label={USE_MOCK ? 'Demo: view as' : 'Viewing as'}>
              <span className="role-switch-label">{USE_MOCK ? 'Demo: view as' : 'Viewing as'}</span>
              {me.roles.map((r) => (
                <button key={r} type="button" aria-pressed={r === role} onClick={() => switchTo(r)}>
                  {sideLabel[r]}
                </button>
              ))}
            </div>
          ) : (
            <span className="role-switch-label">{sideLabel[role]}</span>
          )}
          <span className="role-name">{me.name}</span>
        </div>
      </header>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  )
}
