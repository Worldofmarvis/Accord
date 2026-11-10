import { useState } from 'react'
import { api, ApiError, errorMessage } from '../api'
import type { Role } from '../types/me'
import { useAsync } from './useAsync'
import { refreshIncomingProposals } from './useIncomingProposals'

export type StartProblem =
  | { kind: 'no-request' }
  | { kind: 'no-listing' }
  | { kind: 'locked'; name: string; role: Role }
  | { kind: 'request-locked'; name: string; role: Role }
  | { kind: 'sent'; name: string }
  | { kind: 'error'; message: string }

type Option = { id: string; title: string }

/**
 * "Negotiate": sending a proposal, shared by both search screens and the rematch screen.
 *
 * A negotiation only starts after the other side accepts (docs/API.md, "Proposals"), so this
 * sends a proposal and reports `sent`. The person's own side comes from one of their saved items:
 *  - a buyer picks one of their requests (the proposal uses its target and max, privately),
 *  - a seller picks one of their listings that is not already in a negotiation.
 * If the seller got locked in the meantime, the server answers SELLER_LOCKED (or REQUEST_LOCKED for a
 * request that is already in a negotiation) and `problem` says so; `onLocked` lets the screen refresh its list.
 * A request that is already in a negotiation is not offered in the picker, and the server refuses a
 * proposal between a person's own listing and own request.
 */
export function useStartNegotiation(role: Role, onLocked?: () => void) {
  const options = useAsync<{ list: Option[]; blocked: number }>(async () => {
    if (role === 'buyer') {
      const requests = await api.listBuyerRequests()
      const free = requests.filter((r) => !r.locked)
      return { list: free.map((r) => ({ id: r.id, title: r.title })), blocked: requests.length - free.length }
    }
    const [listings, active] = await Promise.all([api.listSellerListings(), api.getSellerActiveNegotiation()])
    const free = listings.filter((l) => l.id !== active?.listingId)
    return { list: free.map((l) => ({ id: l.id, title: l.title })), blocked: listings.length - free.length }
  }, [role])
  const [pickedId, setPickedId] = useState<string>()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [problem, setProblem] = useState<StartProblem | null>(null)
  // The listings or requests a proposal was sent for, so their cards can show "Proposal sent".
  const [sent, setSent] = useState<ReadonlySet<string>>(new Set())

  const list = options.data?.list ?? []
  const selected = list.find((o) => o.id === pickedId) ?? list[0]

  /** `counterpart` is the listing (for a buyer) or the request (for a seller) the proposal is about. */
  async function start(counterpart: { id: string; name: string }) {
    setProblem(null)
    if (options.error) {
      setProblem({ kind: 'error', message: errorMessage(options.error) })
      return
    }
    if (options.loading && !options.data) {
      setProblem({ kind: 'error', message: 'Your details are still loading. Try again in a moment.' })
      return
    }
    if (!selected) {
      // Everything the buyer has is already in a negotiation: say so, rather than asking for a new request.
      if (role === 'buyer' && (options.data?.blocked ?? 0) > 0) {
        setProblem({ kind: 'request-locked', name: '', role })
      } else {
        setProblem({ kind: role === 'buyer' ? 'no-request' : 'no-listing' })
      }
      return
    }

    setBusyId(counterpart.id)
    try {
      await api.sendProposal(
        role === 'buyer'
          ? { role, listingId: counterpart.id, requestId: selected.id }
          : { role, listingId: selected.id, requestId: counterpart.id },
      )
      setProblem({ kind: 'sent', name: counterpart.name })
      setSent((prev) => new Set(prev).add(counterpart.id))
      refreshIncomingProposals()
    } catch (e) {
      if (e instanceof ApiError && e.code === 'SELLER_LOCKED') {
        setProblem({ kind: 'locked', name: counterpart.name, role })
        onLocked?.()
      } else if (e instanceof ApiError && e.code === 'REQUEST_LOCKED') {
        setProblem({ kind: 'request-locked', name: counterpart.name, role })
        options.reload()
        onLocked?.()
      } else {
        setProblem({ kind: 'error', message: errorMessage(e) })
      }
    } finally {
      setBusyId(null)
    }
  }

  return { options: list, selected, pick: setPickedId, start, busyId, problem, sent }
}
