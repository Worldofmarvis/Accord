import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError, errorMessage } from '../api'
import { useAsync } from './useAsync'

export type StartProblem =
  | { kind: 'no-request' }
  | { kind: 'locked'; sellerName: string }
  | { kind: 'error'; message: string }

/**
 * Starting a negotiation, shared by the Search and rematch screens.
 *
 * The buyer's target and max come from one of their saved requests (docs/API.md), so this
 * loads the buyer's requests and uses the one picked, or the first. On success it opens the
 * new negotiation. If the seller got locked in the meantime, the server answers
 * SELLER_LOCKED and `problem` says so; `onLocked` lets the screen refresh its list.
 * With `enabled` false (the person is viewing as a seller) nothing is loaded.
 */
export function useStartNegotiation(onLocked?: () => void, enabled = true) {
  const navigate = useNavigate()
  // Only buyers have requests, so a seller viewing the page never asks for them.
  const requests = useAsync(() => (enabled ? api.listBuyerRequests() : Promise.resolve([])), [enabled])
  const [pickedId, setPickedId] = useState<string>()
  const [busyListingId, setBusyListingId] = useState<string | null>(null)
  const [problem, setProblem] = useState<StartProblem | null>(null)

  const list = requests.data ?? []
  const selected = list.find((r) => r.id === pickedId) ?? list[0]

  async function start(listing: { id: string; sellerName: string }) {
    setProblem(null)
    if (requests.error) {
      setProblem({ kind: 'error', message: errorMessage(requests.error) })
      return
    }
    if (requests.loading && !requests.data) {
      setProblem({ kind: 'error', message: 'Your requests are still loading. Try again in a moment.' })
      return
    }
    if (!selected) {
      setProblem({ kind: 'no-request' })
      return
    }

    setBusyListingId(listing.id)
    try {
      const { id } = await api.startNegotiation({ listingId: listing.id, requestId: selected.id })
      navigate(`/negotiations/${encodeURIComponent(id)}`)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'SELLER_LOCKED') {
        setProblem({ kind: 'locked', sellerName: listing.sellerName })
        onLocked?.()
      } else {
        setProblem({ kind: 'error', message: errorMessage(e) })
      }
    } finally {
      setBusyListingId(null)
    }
  }

  return {
    requests: list,
    selected,
    pick: setPickedId,
    start,
    busyListingId,
    problem,
  }
}
