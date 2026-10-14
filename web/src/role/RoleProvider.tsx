import { useState, type ReactNode } from 'react'
import { api, ApiError, USE_MOCK } from '../api'
import DemoLogin from '../components/DemoLogin'
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
    // Nobody is signed in yet (or the saved user is unknown): let the person pick a demo user.
    if (!USE_MOCK && meState.error instanceof ApiError && meState.error.code === 'UNAUTHENTICATED') {
      return (
        <div className="shell-main">
          <DemoLogin onChosen={meState.reload} />
        </div>
      )
    }
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
