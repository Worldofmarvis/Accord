import { useEffect, useState } from 'react'
import { api, POLL_MS } from '../api'
import type { Role } from '../types/me'

// A badge does not need to be as fresh as a live negotiation, so it asks less often.
const NOTIFY_MS = Math.max(POLL_MS, 10_000)

const listeners = new Set<() => void>()

/** Screens call this after they send, answer or withdraw a proposal, so the badge changes at once. */
export function refreshIncomingProposals() {
  listeners.forEach((reload) => reload())
}

/**
 * How many proposals wait for the answer of the side the person is viewing (the number on the
 * "Proposals" link). Counts only that side, because a person can be both buyer and seller.
 * Runs on every screen, pauses while the tab is hidden, and keeps the last number when a call fails.
 */
export function useIncomingProposals(role: Role): number {
  const [state, setState] = useState<{ role: Role; count: number } | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (document.hidden) return
      try {
        const count = await api.countIncomingProposals(role)
        if (!cancelled) setState({ role, count })
      } catch {
        // Keep the last number. The Proposals screen shows real errors.
      }
    }

    function onVisibilityChange() {
      if (!document.hidden) void load()
    }

    void load()
    const timer = setInterval(() => void load(), NOTIFY_MS)
    listeners.add(load)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      cancelled = true
      clearInterval(timer)
      listeners.delete(load)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [role])

  // A number counted for the other side is never shown after switching sides.
  return state?.role === role ? state.count : 0
}
