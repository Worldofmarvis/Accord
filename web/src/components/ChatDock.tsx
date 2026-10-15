import { useEffect, useId, useRef, useState } from 'react'
import { useChat } from '../hooks/useChat'
import type { Role } from '../types/marketplace'
import ChatPanel from './ChatPanel'
import { ChatIcon, CloseIcon } from './icons'

type Props = { negotiationId: string; counterpartName: string; viewerRole: Role }

// How many messages the person has already read, kept for this tab so a reload does not forget it.
const readKey = (id: string, role: Role) => `chat-read:${id}:${role}`

function loadRead(key: string): number {
  try {
    const n = Number(sessionStorage.getItem(key))
    return Number.isInteger(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

function saveRead(key: string, count: number) {
  try {
    sessionStorage.setItem(key, String(count))
  } catch {
    // Private mode or storage full: the count just starts again next time.
  }
}

/**
 * The chat lives in the bottom-right corner, like a messenger: a round button that opens the panel.
 * It stays mounted while closed, so messages keep arriving. Anything the other person wrote that has
 * not been read yet is shown on the button (a count) and in a small preview above it.
 */
export default function ChatDock({ negotiationId, counterpartName, viewerRole }: Props) {
  const chat = useChat(negotiationId)
  const key = readKey(negotiationId, viewerRole)
  const [open, setOpen] = useState(false)
  const [read, setRead] = useState(() => loadRead(key))
  const launcher = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const { messages } = chat

  // While the chat is open, everything in it counts as read.
  useEffect(() => {
    if (!open) return
    setRead(messages.length)
    saveRead(key, messages.length)
  }, [open, messages.length, key])

  const unread = open
    ? []
    : messages.slice(read).filter((m) => m.from !== 'system' && m.from !== viewerRole)
  const latest = unread[unread.length - 1]

  function close() {
    setOpen(false)
    launcher.current?.focus()
  }

  const firstName = counterpartName.split(' ')[0]
  const count = unread.length

  return (
    <div className="chat-dock">
      <ChatPanel
        id={panelId}
        chat={chat}
        counterpartName={counterpartName}
        viewerRole={viewerRole}
        open={open}
        onClose={close}
      />
      {latest && latest.from !== 'system' && (
        <button type="button" className="chat-preview" onClick={() => setOpen(true)} role="status">
          <span className="chat-preview-who">
            {firstName}
            {count > 1 ? ` (${count} new messages)` : ' sent a message'}
          </span>
          <span className="chat-preview-text">{latest.text}</span>
        </button>
      )}
      <button
        ref={launcher}
        type="button"
        className={`chat-launcher${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={
          open ? 'Close chat' : count > 0 ? `Open chat with ${firstName}, ${count} new` : `Open chat with ${firstName}`
        }
        onClick={() => (open ? close() : setOpen(true))}
      >
        {open ? <CloseIcon size={20} /> : <ChatIcon size={22} />}
        <span className="chat-launcher-label">{open ? 'Close' : 'Chat'}</span>
        {count > 0 && (
          <span className="chat-badge" aria-hidden="true">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
    </div>
  )
}
