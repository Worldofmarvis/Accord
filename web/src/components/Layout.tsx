import { NavLink, Outlet, Link } from 'react-router-dom'

const links = [
  { to: '/search', label: 'Search' },
  { to: '/buyer', label: 'Buyer dashboard' },
  { to: '/seller', label: 'Seller dashboard' },
]

export default function Layout() {
  return (
    <div className="shell">
      <header className="shell-header">
        <Link to="/" className="brand">
          Agent Negotiation Marketplace
        </Link>
        <nav className="shell-nav" aria-label="Main">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  )
}
