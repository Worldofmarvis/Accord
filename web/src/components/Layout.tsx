import type { ReactNode } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useIncomingProposals } from '../hooks/useIncomingProposals'
import { useRole } from '../role/useRole'
import type { Role } from '../types/me'
import AccordMark from './AccordMark'
import SideMenu from './SideMenu'
import { SearchIcon } from './icons'
import { BarsIcon, ChevronDownIcon, GridIcon, MailIcon, UserIcon } from './sellerArt'

const sideLabel: Record<Role, string> = { buyer: 'Buyer', seller: 'Seller' }

// Small icons in front of the menu names (shown when the header menu replaces the side bar on narrow screens).
const navIcons: Record<string, ReactNode> = {
  '/search': <SearchIcon size={20} />,
  '/seller': <GridIcon size={20} />,
  '/buyer': <GridIcon size={20} />,
  '/seller/history': <BarsIcon size={20} />,
  '/proposals': <MailIcon size={20} />,
}

export default function Layout() {
  const { me, role } = useRole()
  const { pathname } = useLocation()
  const incoming = useIncomingProposals(role)

  // Task pages (live negotiation, approve and pay, no agreement) get a focused header:
  // no menu, just the logo and one clear way back, so nobody leaves halfway by accident.
  const focused = pathname.startsWith('/negotiations/')
  const dashboard = role === 'buyer' ? '/buyer' : '/seller'
  // Both dashboards fill the whole width (side menu and background included).
  const bleed = pathname === '/seller' || pathname === '/buyer'
  // The menu lives in a side bar on every normal page. Task pages keep their focused header.
  const framed = !focused

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

  const content = (
    <main className={`shell-main${bleed ? ' shell-main-bleed' : ''}`}>
      {/* A new key on each address replays the short fade-in, so changing screens feels smooth. */}
      <div key={pathname} className="page-enter">
        <Outlet />
      </div>
    </main>
  )

  return (
    <div className="shell">
      <header className={`shell-header shell-header-styled${focused ? ' shell-header-focus' : ''}`}>
        <div className="brand-group">
          <Link to="/" className="brand brand-mark" aria-label="Accord home">
            <AccordMark size={46} onDark />
            Accord
          </Link>
          <span className={`role-pill role-pill-${role}`}>{sideLabel[role]}</span>
        </div>
        {!focused && (
        <nav className="shell-nav shell-nav-compact" aria-label="Main">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end
              aria-label={l.count ? `${l.label}, ${l.count} waiting for your answer` : undefined}
            >
              {navIcons[l.to]}
              {l.label}
              {l.count ? (
                <span className="nav-count" aria-hidden="true">
                  {l.count > 9 ? '9+' : l.count}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        )}
        <div className="role-area">
          {focused && (
            <Link to={dashboard} className="back-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5" />
                <path d="m11 6-6 6 6 6" />
              </svg>
              Back to dashboard
            </Link>
          )}
          {/* Looks like an account menu, but it is not one: plain text, nothing to click. */}
          <span className="user-chip">
            <span className="user-avatar" aria-hidden="true">
              <UserIcon size={26} />
            </span>
            <span className="role-name">{me.name}</span>
            <ChevronDownIcon size={16} />
          </span>
        </div>
      </header>
      {framed ? (
        <div className="sd-frame">
          <SideMenu role={role} incoming={incoming} />
          {content}
        </div>
      ) : (
        content
      )}
    </div>
  )
}
