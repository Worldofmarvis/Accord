import { useState, type ReactNode } from 'react'
import { api, setDemoRole } from '../api'
import { ErrorCard, LoadingCard } from '../components/StateCards'
import { useAsync } from '../hooks/useAsync'
import type { Role } from '../types/me'
import { RoleContext } from './context'

const STORAGE_KEY = 'accord.role'

// Remembering the last side is only a convenience, so storage problems are ignored.
function remembered(): Role | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'buyer' || value === 'seller' ? value : null
  } catch {
    return null
  }
}

/**
 * Asks the API who the person is (GET /api/me) and keeps track of which side they are
 * viewing. Shows a loading or error card instead of the app until that is known.
 */
export default function RoleProvider({ children }: { children: ReactNode }) {
  const meState = useAsync(() => api.getMe(), [])
  const [chosen, setChosen] = useState<Role | null>(remembered)

  if (meState.error != null && !meState.data) {
    return (
      <div className="shell-main">
        <ErrorCard error={meState.error} onRetry={meState.reload} />
      </div>
    )
  }
  if (!meState.data) {
    return (
      <div className="shell-main">
        <LoadingCard label="Loading your account..." />
      </div>
    )
  }

  const me = meState.data
  if (me.roles.length === 0) {
    return (
      <div className="shell-main">
        <div className="state-card state-card-error" role="alert">
          <p>Your account is not set up as a buyer or a seller yet.</p>
        </div>
      </div>
    )
  }

  // A remembered side only counts if the account still has it.
  const role: Role = chosen && me.roles.includes(chosen) ? chosen : me.roles[0]

  // The demo data answers differently for a buyer and a seller, and children ask for data as soon
  // as they appear, so this is set during render (it is only a variable, so repeating it is harmless).
  setDemoRole(role)

  function setRole(next: Role) {
    if (!me.roles.includes(next)) return
    setChosen(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }

  return <RoleContext.Provider value={{ me, role, setRole }}>{children}</RoleContext.Provider>
}
