// Whole dollars only (docs/API.md, "Money"). Digits, an optional leading "$", and thousands commas
// like "1,200" are accepted. Anything else is rejected instead of being "cleaned up" into a different number.
const MONEY = /^\$?\s*(\d{1,3}(,\d{3})+|\d+)$/
const DIGITS = /^\d+$/

function positiveInt(text: string): number | null {
  const n = Number(text.replace(/[$,\s]/g, ''))
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

/**
 * "$1,200" or "350" -> a whole number of dollars above 0.
 * Returns null for empty or invalid input ("3-5", "-50", "12abc", "1e3", "350.50", "0"), never a guess.
 */
export function parsePrice(value: string): number | null {
  const text = value.trim()
  return MONEY.test(text) ? positiveInt(text) : null
}

/** "7" -> 7. A whole number of days above 0 (digits only, no "$" or commas). */
export function parseDays(value: string): number | null {
  const text = value.trim()
  return DIGITS.test(text) ? positiveInt(text) : null
}

/** Shown under a money field when its text is not a whole number of dollars. */
export const PRICE_ERROR = 'Enter a whole dollar amount above 0, like 350.'

/**
 * Today as YYYY-MM-DD in the person's own time zone, for date inputs.
 * (`toISOString()` is UTC, so anyone ahead of UTC would be offered yesterday for the first hours of the day.)
 */
export function todayISO(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
