import { useId } from 'react'

/**
 * The Accord mark: two circles, one for each side, overlapping where they agree.
 * Use onDark on the navy header, where the deep blue circle would disappear.
 */
export default function AccordMark({ size = 28, onDark = false }: { size?: number; onDark?: boolean }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size * 0.65} viewBox="-1 -1 52 34" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3aa8ff" />
          <stop offset="1" stopColor="#0a7df0" />
        </linearGradient>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2457e0" />
          <stop offset="1" stopColor="#0033c9" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14.4" fill={onDark ? '#5aa9ff' : `url(#${id}l)`} stroke={onDark ? 'none' : '#fff'} strokeWidth="1.6" />
      <circle cx="34" cy="16" r="14.4" fill={onDark ? '#ffffff' : `url(#${id}r)`} stroke={onDark ? 'none' : '#fff'} strokeWidth="1.6" />
      <path
        d="M25 3.8a14.4 14.4 0 0 1 0 24.4 14.4 14.4 0 0 1 0-24.4Z"
        fill={onDark ? 'var(--color-brand-header)' : '#eef3ff'}
        stroke={onDark ? 'none' : '#fff'}
        strokeWidth="1.6"
      />
    </svg>
  )
}
