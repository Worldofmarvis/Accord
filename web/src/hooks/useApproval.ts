import { useEffect, useState } from 'react'
import { api, POLL_MS } from '../api'
import { isFinalError } from '../api/errors'
import type { DealApproval } from '../types/marketplace'

/**
 * Both humans' decisions on an agreed price (shared state, same object for buyer and seller).
 *
 * - Loads it, then asks again every POLL_MS while the deal is "pending", so each side sees the
 *   other's answer appear. Stops once it is "approved" or "declined", or on a final error.
 * - Pauses while the browser tab is hidden and refreshes when it is shown again.
 * - `decide` records the caller's own answer. The server rejects a second answer, and the screen
 *   then reloads the real state.
 */
export function useApproval(id: string, enabled: boolean) {
  const [approval, setApproval] = useState<DealApproval | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<unknown>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let running = false
    let loadedOnce = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function poll() {
      if (cancelled || running) return
      if (document.hidden && loadedOnce) {
        timer = setTimeout(poll, POLL_MS)
        return
      }
      running = true
      let again = true
      try {
        const next = await api.getApproval(id)
        if (cancelled) return
        setApproval(next)
        setError(null)
        again = next.status === 'pending'
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
  }, [id, enabled, attempt])

  async function decide(decision: 'approved' | 'declined') {
    if (busy) return
    setBusy(true)
    setActionError(null)
    try {
      setApproval(await (decision === 'approved' ? api.approveDeal(id) : api.declineDeal(id)))
      setError(null)
      setAttempt((n) => n + 1) // keep polling in case the other side has not answered yet
    } catch (e) {
      setActionError(e)
      setAttempt((n) => n + 1) // show the real state, for example when the answer was already recorded
    } finally {
      setBusy(false)
    }
  }

  return {
    approval,
    error,
    loading,
    busy,
    actionError,
    retry: () => setAttempt((n) => n + 1),
    approve: () => decide('approved'),
    decline: () => decide('declined'),
  }
}
