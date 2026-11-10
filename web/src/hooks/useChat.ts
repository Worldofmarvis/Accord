import { useCallback, useEffect, useState } from 'react'
import { api, POLL_MS } from '../api'
import { isFinalError } from '../api/errors'
import type { ChatMessage } from '../types/marketplace'

/**
 * The chat of one negotiation.
 *
 * - Loads the messages, then asks for newer ones (`after` the last id) every POLL_MS.
 * - `send` stores a message through the API and adds what the server returns,
 *   including its warning if the text looked like a price. The server decides what
 *   counts as a warning: the browser never changes prices or judges chat text.
 * - Messages are matched by id, so the same message is never shown twice.
 */
export function useChat(id: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const merge = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id))
      const fresh = incoming.filter((m) => !seen.has(m.id))
      return fresh.length > 0 ? [...prev, ...fresh] : prev
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    let loadedOnce = false
    let after: string | undefined
    let timer: ReturnType<typeof setTimeout> | undefined

    setMessages([])
    setError(null)
    setLoading(true)

    async function poll() {
      if (document.hidden && loadedOnce) {
        timer = setTimeout(poll, POLL_MS)
        return
      }
      let again = true
      try {
        const incoming = await api.getMessages(id, after)
        if (cancelled) return
        merge(incoming)
        if (incoming.length > 0) after = incoming[incoming.length - 1].id
        setError(null)
      } catch (e) {
        if (cancelled) return
        setError(e)
        again = !isFinalError(e)
      }
      loadedOnce = true
      setLoading(false)
      if (again) timer = setTimeout(poll, POLL_MS)
    }

    void poll()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [id, merge])

  /** Sends a message. Throws if the server refuses it, so the caller can keep the draft. */
  const send = useCallback(
    async (text: string) => {
      merge(await api.sendMessage(id, text))
    },
    [id, merge],
  )

  return { messages, loading, error, send }
}
