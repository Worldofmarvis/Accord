import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { BarsIcon, GearIcon, HandshakeIcon, HomeIcon, PayPalMark, ShieldCheckArt, TagIcon } from './sellerArt'

/**
 * Side menu of the seller dashboard.
 * Dashboard and Sales History are real links. The other items are for looks only:
 * they are plain text (not links or buttons), so they cannot be clicked or tabbed to.
 */
export default function SellerSidebar() {
  return (
    <aside className="sd-side" aria-label="Seller menu">
      <nav className="sd-side-nav" aria-label="Seller sections">
        <NavLink to="/seller" end className="sd-side-item">
          <HomeIcon size={24} />
          Dashboard
        </NavLink>
        <Static icon={<TagIcon size={24} />}>My Listings</Static>
        <Static icon={<HandshakeIcon size={24} />}>Negotiations</Static>
        <NavLink to="/seller/history" className="sd-side-item">
          <BarsIcon size={24} />
          Sales History
        </NavLink>
        <Static icon={<GearIcon size={24} />}>Settings</Static>
      </nav>

      <div className="sd-confidence">
        <ShieldCheckArt size={50} />
        <p className="sd-confidence-title">Sell with Confidence</p>
        <p className="sd-confidence-text">Secure payments powered by PayPal.</p>
        <PayPalMark size={34} />
      </div>
    </aside>
  )
}

/** A menu item that only looks like the others: no link, no button, no focus. */
function Static({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="sd-side-item sd-side-static">
      {icon}
      {children}
    </span>
  )
}
