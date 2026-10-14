export const usd = (n: number) => `$${n}`

/** An ISO 8601 time as the viewer's local "HH:MM", for example "10:42". Empty if it can't be read. */
export function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** "YYYY-MM-DD" as a short local date, for example "Oct 28". */
export function formatDate(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  if (!y || !m || !d) return day
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
