import { useEffect, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../api'
import { useChat } from '../hooks/useChat'
import { formatTime } from '../lib/format'
import { LockIcon } from './icons'

import type { Role } from '../types/marketplace'

type Props = { negotiationId: string; counterpartName: string; viewerRole: Role }

const MAX_LENGTH = 500

// Chat is for scope only (rule 5). Messages go to the API as plain text and the
// server decides whether to add a warning: this component never judges the text.
export default function ChatPanel({ negotiationId, counterpartName, viewerRole }: Props) {
  const { messages, loading, error, send } = useChat(negotiationId)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const firstName = counterpartName.split(' ')[0]
  const otherRole = viewerRole === 'buyer' ? 'seller' : 'buyer'

  // Keep the newest message in view.
  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [messages.length])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setSendError(null)
    try {
      await send(text)
      setDraft('')
    } catch (err) {
      // Keep the draft so nothing is lost.
      setSendError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <section aria-label="Chat" className="card chat">
      <div className="chat-head">
        <h2>Chat with {firstName}</h2>
        <span className="chat-online">
          <span className="chat-online-dot" />
          Online
        </span>
      </div>

      <div className="callout callout-info chat-rule">
        <LockIcon size={16} color="var(--color-primary)" />
        <span>You can discuss scope here. Chat can never change the price. Only the negotiation engine does that.</span>
      </div>

      <div className="chat-log" role="log" aria-live="polite" ref={logRef}>
        {loading && messages.length === 0 && <div className="chat-system chat-system-note">Loading messages...</div>}
        {!loading && error != null && messages.length === 0 && (
          <div className="chat-system chat-system-warning">{errorMessage(error)}</div>
        )}
        {messages.map((m) => {
          if (m.from === 'system') {
            return (
              <div key={m.id} className={`chat-system chat-system-${m.tone}`}>
                {m.text}
              </div>
            )
          }
          const mine = m.from === viewerRole
          return (
            <div key={m.id} className={`chat-msg ${mine ? 'is-mine' : ''}`}>
              <div className="muted caption chat-meta">
                {mine ? 'You' : `${firstName}, ${otherRole}`}. {formatTime(m.sentAt)}
              </div>
              <div className="chat-bubble">{m.text}</div>
            </div>
          )
        })}
      </div>

      <form className="chat-form" onSubmit={submit}>
        <label htmlFor="chat-msg" className="sr-only">
          Message about scope
        </label>
        <input
          id="chat-msg"
          className="input chat-input"
          type="text"
          placeholder="Message about scope..."
          maxLength={MAX_LENGTH}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-lg" disabled={sending || !draft.trim()}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
      {sendError && (
        <p className="field-error chat-foot" role="alert">
          Your message was not sent. {sendError}
        </p>
      )}
      {error != null && messages.length > 0 && !sendError && (
        <p className="muted caption chat-foot">We can't refresh the chat right now. Trying again...</p>
      )}
      <div className="muted caption chat-foot">Messages are saved with this negotiation.</div>
    </section>
  )
}
