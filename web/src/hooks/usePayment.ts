import { useEffect, useState } from 'react'
import { api, POLL_MS } from '../api'
import { isFinalError } from '../api/errors'
import type { Payment } from '../types/marketplace'

/**
 * The payment for an agreed deal, shared by buyer and seller.
 *
 * - Loads it once `enabled` (both sides approved), then asks again every POLL_MS until it is "paid",
 *   so the seller sees the payment arrive without refreshing. Pauses while the tab is hidden.
 * - `setPaid` takes the result of the capture call straight away. A slower earlier answer can never
 *   move a paid deal back to unpaid.
 */
export function usePayment(id: string, enabled: boolean) {
  const [payment, setPayment] = useState<Payment | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function poll() {
      if (cancelled) return
      if (document.hidden) {
        timer = setTimeout(poll, POLL_MS)
        return
      }
      let again = true
      try {
        const next = await api.getPayment(id)
        if (cancelled) return
        setPayment((prev) => (prev?.status === 'paid' ? prev : next))
        setError(null)
        again = next.status !== 'paid'
      } catch (e) {
        if (cancelled) return
        setError(e)
        again = !isFinalError(e)
      }
      if (!cancelled && again) timer = setTimeout(poll, POLL_MS)
    }

    void poll()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [id, enabled, attempt])

  return {
    payment,
    error,
    retry: () => setAttempt((n) => n + 1),
    setPaid: (p: Payment) => setPayment(p),
  }
}
