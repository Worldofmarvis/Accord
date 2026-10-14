import { useEffect, useRef, useState, type FormEvent } from 'react'
import { errorMessage, USE_MOCK } from '../api'
import { useChat } from '../hooks/useChat'
import { formatTime } from '../lib/format'
import type { Role } from '../types/marketplace'
import { LockIcon } from './icons'

type Props = {
  negotiationId: string
  /** The side this person is on. Decides which bubbles are "mine". */
  role: Role
  /** The other person's name, for the header and the bubble labels. */
  counterpartName: string
}

const MAX_LENGTH = 500

// Chat is for scope only (rule 5). Messages go to the API as plain text and the
// server decides whether to add a warning: this component never judges the text.
// Message text is rendered as text, so pasted markup shows up as text and never runs.
export default function ChatPanel({ negotiationId, role, counterpartName }: Props) {
  const { messages, loading, error, send } = useChat(negotiationId)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  // Follow new messages, unless the person has scrolled up to read older ones.
  const stickToBottom = useRef(true)
  const firstName = counterpartName.split(' ')[0]
  const counterpartRole: Role = role === 'buyer' ? 'seller' : 'buyer'
  const offline = error != null

  useEffect(() => {
    const log = logRef.current
    if (log && stickToBottom.current) log.scrollTop = log.scrollHeight
  }, [messages.length])

  function onScroll() {
    const log = logRef.current
    if (log) stickToBottom.current = log.scrollHeight - log.scrollTop - log.clientHeight < 80
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setSendError(null)
    stickToBottom.current = true
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
        <span className={`chat-online${offline ? ' is-offline' : ''}`}>
          <span className="chat-online-dot" />
          {USE_MOCK ? 'Demo data' : offline ? 'Reconnecting...' : 'Live'}
        </span>
      </div>

      <div className="callout callout-info chat-rule">
        <LockIcon size={16} color="var(--color-primary)" />
        <span>You can discuss scope here. Chat can never change the price. Only the negotiation engine does that.</span>
      </div>

      <div className="chat-log" role="log" aria-live="polite" tabIndex={0} ref={logRef} onScroll={onScroll}>
        {loading && messages.length === 0 && <div className="chat-system chat-system-note">Loading messages...</div>}
        {!loading && !offline && messages.length === 0 && (
          <div className="chat-system chat-system-note">No messages yet. Say hello and confirm the scope.</div>
        )}
        {!loading && offline && messages.length === 0 && (
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
          const mine = m.from === role
          return (
            <div key={m.id} className={`chat-msg ${mine ? 'is-mine' : ''}`}>
              <div className="muted caption chat-meta">
                {mine ? 'You' : `${firstName}, ${counterpartRole}`}. {formatTime(m.sentAt)}
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
          disabled={sending}
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
      {offline && messages.length > 0 && !sendError && (
        <p className="muted caption chat-foot">We can't refresh the chat right now. Trying again...</p>
      )}
      <div className="muted caption chat-foot">Messages are saved with this negotiation.</div>
    </section>
  )
}
