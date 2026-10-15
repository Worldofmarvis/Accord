import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useIncomingProposals } from '../hooks/useIncomingProposals'
import { useRole } from '../role/useRole'
import type { Role } from '../types/me'

const sideLabel: Record<Role, string> = { buyer: 'Buyer', seller: 'Seller' }

export default function Layout() {
  const { me, role } = useRole()
  const { pathname } = useLocation()
  const incoming = useIncomingProposals(role)

  // Each side has its own menu: a buyer finds services, a seller finds customers.
  // The side was chosen on the first screen and stays the same for this tab.
  const links: { to: string; label: string; count?: number }[] =
    role === 'buyer'
      ? [
          { to: '/search', label: 'Find services' },
          { to: '/buyer', label: 'Buyer dashboard' },
          { to: '/proposals', label: 'Proposals', count: incoming },
        ]
      : [
          { to: '/search', label: 'Find customers' },
          { to: '/seller', label: 'Seller dashboard' },
          { to: '/seller/history', label: 'Sales history' },
          { to: '/proposals', label: 'Proposals', count: incoming },
        ]

  return (
    <div className="shell">
      <header className="shell-header">
        <div className="brand-group">
          <Link to="/" className="brand">
            Agent Negotiation Marketplace
          </Link>
          <span className={`role-pill role-pill-${role}`}>{sideLabel[role]}</span>
        </div>
        <nav className="shell-nav" aria-label="Main">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end
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
          <span className="role-name">{me.name}</span>
        </div>
      </header>
      <main className="shell-main">
        {/* A new key on each address replays the short fade-in, so changing screens feels smooth. */}
        <div key={pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
