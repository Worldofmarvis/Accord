import type { MouseEvent, ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import type { Role } from '../types/me'
import { SearchIcon } from './icons'
import { BarsIcon, ClipboardIcon, GearIcon, HandshakeIcon, HomeIcon, MailIcon, PayPalMark, ShieldCheckArt, TagIcon } from './sellerArt'

/**
 * Side menu for both sides. It replaces the links that used to sit in the header.
 * Dashboard, the search page, Proposals (and Sales History for sellers) go to real pages.
 * The other items look and feel like links (hover, pointer) but do nothing when clicked.
 */
export default function SideMenu({ role, incoming = 0 }: { role: Role; incoming?: number }) {
  const seller = role === 'seller'
  return (
    <aside className="sd-side" aria-label={seller ? 'Seller menu' : 'Buyer menu'}>
      <nav className="sd-side-nav" aria-label="Sections">
        <NavLink to={seller ? '/seller' : '/buyer'} end className="sd-side-item">
          <HomeIcon size={24} />
          Dashboard
        </NavLink>
        <NavLink to="/search" className="sd-side-item">
          <SearchIcon size={24} />
          {seller ? 'Find customers' : 'Find services'}
        </NavLink>
        {seller ? (
          <LookOnlyLink icon={<TagIcon size={24} />}>My Listings</LookOnlyLink>
        ) : (
          <LookOnlyLink icon={<ClipboardIcon size={24} />}>My Requests</LookOnlyLink>
        )}
        <LookOnlyLink icon={<HandshakeIcon size={24} />}>Negotiations</LookOnlyLink>
        {seller && (
          <NavLink to="/seller/history" className="sd-side-item">
            <BarsIcon size={24} />
            Sales History
          </NavLink>
        )}
        <NavLink
          to="/proposals"
          className="sd-side-item"
          aria-label={incoming ? `Proposals, ${incoming} waiting for your answer` : undefined}
        >
          <MailIcon size={24} />
          Proposals
          {incoming ? (
            <span className="sd-side-count" aria-hidden="true">
              {incoming > 9 ? '9+' : incoming}
            </span>
          ) : null}
        </NavLink>
        <LookOnlyLink icon={<GearIcon size={24} />}>Settings</LookOnlyLink>
      </nav>

      <div className="sd-confidence">
        <ShieldCheckArt size={50} />
        <p className="sd-confidence-title">{seller ? 'Sell' : 'Buy'} with Confidence</p>
        <p className="sd-confidence-text">Secure payments powered by PayPal.</p>
        <PayPalMark size={34} />
      </div>
    </aside>
  )
}

/** Looks like a menu link, but clicking it does nothing yet (the page behind it is not built). */
function LookOnlyLink({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <a href="#" className="sd-side-item" aria-disabled="true" onClick={(e: MouseEvent<HTMLAnchorElement>) => e.preventDefault()}>
      {icon}
      {children}
    </a>
  )
}
