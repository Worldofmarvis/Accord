type IconProps = { size?: number; color?: string }

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function LockIcon({ size = 16, color = 'currentColor' }: IconProps) {
  return (
    <svg {...base} width={size} height={size} stroke={color} strokeWidth={2.4}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  )
}

export function SearchIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg {...base} width={size} height={size} stroke={color} strokeWidth={2.2}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  )
}

export function CloseIcon({ size = 22, color = 'currentColor' }: IconProps) {
  return (
    <svg {...base} width={size} height={size} stroke={color} strokeWidth={2.6}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}
