import { useState, type FormEvent } from 'react'
import { LockIcon } from './icons'
import type { ChatMessage } from '../types/marketplace'

type Props = { sellerName: string; initialMessages: ChatMessage[] }

// Looks like the buyer is trying to set a price in chat.
const PRICE_PATTERN = /\$\s?\d|\b\d+\s?(usd|dollars)\b/i

const PRICE_WARNING = "Prices can't be changed in chat. Your agent makes offers through the negotiation."

const nowLabel = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

// Chat is for scope only (rule 4). The warning here is a courtesy hint:
// the back end must still ignore chat text when it decides prices.
export default function ChatPanel({ sellerName, initialMessages }: Props) {
  const [messages, setMessages] = useState(initialMessages)
  const [draft, setDraft] = useState('')
  const firstName = sellerName.split(' ')[0]

  function send(e: FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    const stamp = Date.now()
    const next: ChatMessage[] = [{ id: `u-${stamp}`, from: 'buyer', time: nowLabel(), text }]
    if (PRICE_PATTERN.test(text)) {
      next.push({ id: `w-${stamp}`, from: 'system', tone: 'warning', text: PRICE_WARNING })
    }
    setMessages((prev) => [...prev, ...next])
    setDraft('')
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

      <div className="chat-log" role="log" aria-live="polite">
        {messages.map((m) => {
          if (m.from === 'system') {
            return (
              <div key={m.id} className={`chat-system chat-system-${m.tone}`}>
                {m.text}
              </div>
            )
          }
          const mine = m.from === 'buyer'
          return (
            <div key={m.id} className={`chat-msg ${mine ? 'is-mine' : ''}`}>
              <div className="muted caption chat-meta">
                {mine ? 'You' : `${firstName}, seller`}. {m.time}
              </div>
              <div className="chat-bubble">{m.text}</div>
            </div>
          )
        })}
      </div>

      <form className="chat-form" onSubmit={send}>
        <label htmlFor="chat-msg" className="sr-only">
          Message about scope
        </label>
        <input
          id="chat-msg"
          className="input chat-input"
          type="text"
          placeholder="Message about scope..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-lg">
          Send
        </button>
      </form>
      <div className="muted caption chat-foot">Messages are saved with this negotiation.</div>
    </section>
  )
}
