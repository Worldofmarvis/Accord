// Icons and illustrations for the seller look. All inline SVG: nothing to download, and colors follow the text color.
import { useId, type ReactNode } from 'react'

type IconProps = { size?: number; color?: string; strokeWidth?: number }

function Svg({ size = 20, color = 'currentColor', strokeWidth = 2, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export const GridIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
  </Svg>
)

export const BarsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 20V11M12 20V4M19 20v-6" strokeWidth={3} />
  </Svg>
)

export const MailIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.4" />
    <path d="m3.8 7.2 8.2 6 8.2-6" />
  </Svg>
)

export const HomeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 11.2 12 3.8l8.5 7.4" />
    <path d="M5.8 10v9.2h4.4v-5.4h3.6v5.4h4.4V10" fill="currentColor" />
  </Svg>
)

export const TagIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 12.4V4.6a1.1 1.1 0 0 1 1.1-1.1h7.8l8.1 8.1a1.6 1.6 0 0 1 0 2.3l-6.4 6.4a1.6 1.6 0 0 1-2.3 0z" />
    <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
  </Svg>
)

export const HandshakeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 11.5 6 8l4-1.2 3 .9" />
    <path d="m21.5 11.5-3.5-3.5-2.6-.7" />
    <path d="m6 8-3.5 3.5 6.6 6.8a1.6 1.6 0 0 0 2.3 0l.6-.6" />
    <path d="m18 8 3.5 3.5-6.4 6.6a1.6 1.6 0 0 1-2.3 0l-4.6-4.7a1.5 1.5 0 0 1 2.1-2.1l1.5 1.4 2.7-2.6a2 2 0 0 1 2.8 0L18 12" />
  </Svg>
)

export const GearIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
    <circle cx="12" cy="12" r="6.6" />
  </Svg>
)

export const UserIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8.5" r="3.8" fill="currentColor" stroke="none" />
    <path d="M4.5 21c.6-4.2 3.7-6.4 7.5-6.4s6.9 2.2 7.5 6.4z" fill="currentColor" stroke="none" />
  </Svg>
)

export const ChevronDownIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
)

export const ChevronRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 5 7 7-7 7" />
  </Svg>
)

export const ArrowRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
)

export const InfoIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
    <path d="M12 11v5.2" stroke="#fff" strokeWidth={2.4} />
    <circle cx="12" cy="7.6" r="1.3" fill="#fff" stroke="none" />
  </Svg>
)

export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" strokeWidth={2.8} />
  </Svg>
)

export const SendIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21.5 3 2.8 10.6l7 2.6 2.6 7z" fill="currentColor" />
    <path d="m21.5 3-11.7 10.2" stroke="#0a3aa8" strokeWidth={1.6} />
  </Svg>
)

export const GlobeIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.6 2.4 3.9 5.4 3.9 9s-1.3 6.6-3.9 9c-2.6-2.4-3.9-5.4-3.9-9S9.4 5.4 12 3z" />
  </Svg>
)

export const DocIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3h8.5L19 7.5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    <path d="M14 3v5h5M8.5 12.5h7M8.5 16h7" />
  </Svg>
)

export const PencilIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z" />
    <path d="m14.5 7.5 3 3" />
  </Svg>
)

export const DollarIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v18M16.5 7.6C15.6 6.4 14 5.8 12 5.8c-2.6 0-4.3 1.2-4.3 3.1 0 4.3 8.6 2.1 8.6 6.3 0 1.9-1.9 3.1-4.3 3.1-2.1 0-3.9-.8-4.8-2.2" />
  </Svg>
)

export const ShieldIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.2 4.8 6v5.6c0 4.4 3 8 7.2 9.2 4.2-1.2 7.2-4.8 7.2-9.2V6z" />
  </Svg>
)

export const ClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.4 2" />
  </Svg>
)

export const LockOpenIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 7.6-1.7" />
  </Svg>
)

export const ChatBubbleIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2.8c5.2 0 9.2 3.4 9.2 7.7s-4 7.7-9.2 7.7c-.9 0-1.8-.1-2.6-.3L5 20.6v-4.1C3.4 15.1 2.8 12.9 2.8 10.5c0-4.3 4-7.7 9.2-7.7z" fill="currentColor" stroke="none" />
    <circle cx="8" cy="10.5" r="1.2" fill="#fff" stroke="none" />
    <circle cx="12" cy="10.5" r="1.2" fill="#fff" stroke="none" />
    <circle cx="16" cy="10.5" r="1.2" fill="#fff" stroke="none" />
  </Svg>
)

export const CheckCircleIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
    <path d="m7.4 12.4 3.2 3.2 6-6.4" stroke="#fff" strokeWidth={2.6} />
  </Svg>
)

export const CrossCircleIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
    <path d="m8.6 8.6 6.8 6.8M15.4 8.6l-6.8 6.8" stroke="#fff" strokeWidth={2.4} />
  </Svg>
)

export const ChartUpIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20v-5M9 20v-8M14 20v-6" strokeWidth={3} />
    <path d="m4 9 5-3.4 4 2.2 6.5-4.6" />
    <path d="M15.6 3.2h4v4" />
  </Svg>
)

/** Blue shield with a check, for the "Sell with confidence" card. */
export function ShieldCheckArt({ size = 52 }: { size?: number }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size * 1.08} viewBox="0 0 48 52" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f8dff" />
          <stop offset="1" stopColor="#0a3aa8" />
        </linearGradient>
      </defs>
      <path d="M24 2 5 9v15c0 12 8 20 19 26 11-6 19-14 19-26V9z" fill={`url(#${id})`} />
      <path d="m14.5 26 7 7 12-13.5" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** A simple PayPal-style double P. Drawn here so no logo file is needed. */
export function PayPalMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <text x="5" y="27" fontFamily="Helvetica, Arial, sans-serif" fontWeight="800" fontStyle="italic" fontSize="30" fill="#003087">
        P
      </text>
      <text x="9" y="25" fontFamily="Helvetica, Arial, sans-serif" fontWeight="800" fontStyle="italic" fontSize="30" fill="#0070e0" fillOpacity="0.9">
        P
      </text>
    </svg>
  )
}

/** The little shop with a rising chart that sits in the corner of the page title area. */
export function StoreArt() {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 340 200" aria-hidden="true" focusable="false" className="sd-store-art">
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5aa9ff" />
          <stop offset="1" stopColor="#1456e0" />
        </linearGradient>
        <linearGradient id={`${id}w`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f7bff" />
          <stop offset="1" stopColor="#0a3aa8" />
        </linearGradient>
      </defs>
      {/* rising bars and arrow */}
      <rect x="236" y="128" width="20" height="50" rx="3" fill={`url(#${id}b)`} opacity="0.85" />
      <rect x="264" y="104" width="20" height="74" rx="3" fill={`url(#${id}b)`} opacity="0.9" />
      <rect x="292" y="78" width="20" height="100" rx="3" fill={`url(#${id}b)`} />
      <path d="M226 100 258 72l22 14 52-46" fill="none" stroke="#1456e0" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M312 36h26v26" fill="none" stroke="#1456e0" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      {/* shop */}
      <rect x="40" y="96" width="176" height="82" rx="6" fill={`url(#${id}w)`} />
      <rect x="62" y="116" width="62" height="52" rx="4" fill="#dbe9ff" />
      <rect x="68" y="122" width="50" height="40" rx="3" fill="#1456e0" />
      <rect x="140" y="112" width="52" height="66" rx="4" fill="#0a2f94" />
      <circle cx="184" cy="146" r="2.6" fill="#9cc4ff" />
      {/* awning */}
      <path d="M32 58h192l12 36H20z" fill="#fff" />
      <path d="M32 58h32l-6 36H20zM96 58h32l-2 36H92zM160 58h32l6 36h-34z" fill="#1a66ee" />
      <path d="M20 94h216c0 8-7 13-14 13s-14-5-14-13c0 8-7 13-14 13s-14-5-14-13c0 8-7 13-14 13s-14-5-14-13c0 8-7 13-14 13s-14-5-14-13c0 8-7 13-14 13s-14-5-14-13c0 8-7 13-14 13s-14-5-14-13c0 8-7 13-14 13S20 102 20 94z" fill="#fff" />
      <rect x="26" y="44" width="204" height="16" rx="6" fill="#0a3aa8" />
      <ellipse cx="128" cy="180" rx="130" ry="9" fill="#0a3aa8" opacity="0.18" />
    </svg>
  )
}

/** A stand-in photo for a listing: a laptop on a desk. Listings have no pictures yet. */
export function ListingThumb() {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 120 100" className="sd-thumb-art" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dfe9f5" />
          <stop offset="1" stopColor="#b7c9de" />
        </linearGradient>
        <linearGradient id={`${id}d`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b98a5e" />
          <stop offset="1" stopColor="#8a5f3b" />
        </linearGradient>
      </defs>
      <rect width="120" height="100" fill={`url(#${id}s)`} />
      <rect x="0" y="0" width="120" height="58" fill="#e9f0f8" />
      <circle cx="96" cy="26" r="16" fill="#fff" opacity="0.7" />
      <path d="M12 58V34c0-6 4-10 9-10s9 4 9 10v24z" fill="#5f8a5a" opacity="0.8" />
      <path d="M16 58V40c0-4 2-7 5-7s5 3 5 7v18z" fill="#6fa069" />
      <rect x="0" y="58" width="120" height="42" fill={`url(#${id}d)`} />
      <path d="M28 78 36 40h50l8 38z" fill="#2a3340" />
      <path d="M34 74 40 44h42l6 30z" fill="#16407f" />
      <path d="M44 66c8-10 18-16 30-14-4 6-10 12-18 16z" fill="#5aa9ff" opacity="0.8" />
      <path d="M22 78h76l4 6H18z" fill="#c8ced6" />
      <rect x="18" y="84" width="84" height="2.6" rx="1.3" fill="#9aa3ad" />
    </svg>
  )
}
