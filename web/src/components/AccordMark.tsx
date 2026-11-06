/**
 * The Accord mark: two circles, one for each side, overlapping where they agree.
 * Colors come from the buyer and seller tokens, so the mark always matches the app.
 * Use onDark on the navy header, where the seller navy would disappear.
 */
export default function AccordMark({ size = 28, onDark = false }: { size?: number; onDark?: boolean }) {
  const left = onDark ? '#5aa9ff' : 'var(--color-buyer)'
  const right = onDark ? '#ffffff' : 'var(--color-seller)'
  const overlap = onDark ? 'var(--color-brand-header)' : 'var(--color-surface)'
  return (
    <svg width={size} height={size * 0.64} viewBox="0 0 50 32" fill="none" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="14" fill={left} />
      <circle cx="34" cy="16" r="14" fill={right} />
      <path d="M25 4.2a14 14 0 0 1 0 23.6 14 14 0 0 1 0-23.6Z" fill={overlap} />
    </svg>
  )
}
