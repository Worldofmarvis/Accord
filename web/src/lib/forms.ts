/** "$1,200" or "350" -> number. Returns null when it is empty or not a positive number. */
export function parsePrice(value: string): number | null {
  const n = Number(value.replace(/[^0-9.]/g, ''))
  return value.trim() && Number.isFinite(n) && n > 0 ? n : null
}

/** Today as YYYY-MM-DD, for date inputs. */
export const todayISO = () => new Date().toISOString().slice(0, 10)
