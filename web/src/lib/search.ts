/**
 * Shared keyword matching for the demo (mock) API. The real back end should behave the same way:
 * every word typed must match somewhere (AND), and "Best match" ranks by where the words matched.
 */

export type SearchField = { text: string; weight: number }

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)

/**
 * Relevance of one item for the typed keyword, or `null` when it does not match.
 * - Each word must appear (as a prefix or part of a word) in at least one field, so "web logo" needs both.
 * - A word scores the weight of the best field it appears in (title counts more than description).
 * - No keyword means everything matches with a score of 0.
 */
export function relevance(keyword: string, fields: SearchField[]): number | null {
  const tokens = words(keyword)
  if (tokens.length === 0) return 0
  const haystack = fields.map((f) => ({ text: f.text.toLowerCase(), weight: f.weight }))
  let score = 0
  for (const token of tokens) {
    const best = haystack.reduce((max, f) => (f.text.includes(token) ? Math.max(max, f.weight) : max), 0)
    if (best === 0) return null
    score += best
  }
  // Small bonus when the whole phrase appears in the highest-weight field (usually the title).
  const top = haystack.reduce((a, b) => (b.weight > a.weight ? b : a))
  if (tokens.length > 1 && top.text.includes(tokens.join(' '))) score += 2
  return score
}
