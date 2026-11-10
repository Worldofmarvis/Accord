import { useEffect, useState } from 'react'
import { api, POLL_MS } from '../api'
import { isFinalError } from '../api/errors'
import type { Negotiation } from '../types/marketplace'

/**
 * The live negotiation (buyer view).
 *
 * - Loads it, then asks again every POLL_MS while its status is "active".
 * - Stops by itself when the status becomes "agreed" or "no_agreement", when the
 *   server says the negotiation doesn't exist or isn't ours, and when the page closes.
 * - Pauses while the browser tab is hidden and refreshes the moment it is shown again.
 * - If a refresh fails, the last good data stays on screen and `error` is set until the next success.
 */
export function useNegotiation(id: string) {
  const [negotiation, setNegotiation] = useState<Negotiation | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    let running = false
    let loadedOnce = false
    let timer: ReturnType<typeof setTimeout> | undefined

    setNegotiation(null)
    setError(null)
    setLoading(true)

    async function poll() {
      if (cancelled || running) return
      if (document.hidden && loadedOnce) {
        timer = setTimeout(poll, POLL_MS)
        return
      }
      running = true
      let again = true
      try {
        const next = await api.getNegotiation(id)
        if (cancelled) return
        setNegotiation(next)
        setError(null)
        again = next.status === 'active'
      } catch (e) {
        if (cancelled) return
        setError(e)
        again = !isFinalError(e)
      } finally {
        running = false
        if (!cancelled) {
          loadedOnce = true
          setLoading(false)
          if (again) timer = setTimeout(poll, POLL_MS)
        }
      }
    }

    function onVisibilityChange() {
      if (!document.hidden && loadedOnce) {
        clearTimeout(timer)
        void poll()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    void poll()

    return () => {
      cancelled = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [id, attempt])

  return { negotiation, error, loading, retry: () => setAttempt((n) => n + 1) }
}
