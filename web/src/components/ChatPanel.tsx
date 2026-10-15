import { useEffect, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../api'
import type { useChat } from '../hooks/useChat'
import { formatTime } from '../lib/format'
import Avatar from './Avatar'
import { CloseIcon, LockIcon } from './icons'

import type { Role } from '../types/marketplace'

type Props = {
  /** The chat itself. The dock owns it so new messages are counted while the panel is closed. */
  chat: ReturnType<typeof useChat>
  counterpartName: string
  viewerRole: Role
  open: boolean
  onClose: () => void
  id?: string
}

const MAX_LENGTH = 500

// Chat is for scope only (rule 5). Messages go to the API as plain text and the
// server decides whether to add a warning: this component never judges the text.
export default function ChatPanel({ chat, counterpartName, viewerRole, open, onClose, id }: Props) {
  const { messages, loading, error, send } = chat
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const firstName = counterpartName.split(' ')[0]
  const otherRole = viewerRole === 'buyer' ? 'seller' : 'buyer'

  const inputRef = useRef<HTMLInputElement>(null)

  // Keep the newest message in view, also right after the panel opens.
  useEffect(() => {
    const log = logRef.current
    if (log && open) log.scrollTop = log.scrollHeight
  }, [messages.length, open])

  // Opening the chat puts the cursor in the message box.
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

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
    <section
      id={id}
      aria-label="Chat"
      className="card chat"
      hidden={!open}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className="chat-head">
        <Avatar name={counterpartName} size={32} />
        <div className="chat-who">
          <h2>{counterpartName}</h2>
          <div className="muted small">{otherRole === 'seller' ? 'Seller' : 'Buyer'}</div>
        </div>
        <span className={`chat-online${error != null ? ' is-offline' : ''}`}>
          <span className="chat-online-dot" />
          {error != null ? 'Offline' : 'Online'}
        </span>
        <button type="button" className="chat-close" aria-label="Close chat" onClick={onClose}>
          <CloseIcon size={16} />
        </button>
      </div>

      <p className="chat-note">
        <LockIcon size={12} />
        Scope only. Chat can never change the price.
      </p>

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
          ref={inputRef}
          className="input chat-input"
          type="text"
          placeholder="Message about scope..."
          maxLength={MAX_LENGTH}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={sending || !draft.trim()}>
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
    </section>
  )
}
