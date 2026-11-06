import { useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, setDemoRole } from '../api'
import RoleChooser from '../components/RoleChooser'
import { ErrorCard, LoadingCard } from '../components/StateCards'
import { useAsync } from '../hooks/useAsync'
import type { Role } from '../types/me'
import { RoleContext } from './context'
import { homePath } from './home'

const STORAGE_KEY = 'accord.role'

// The chosen side belongs to this browser tab (sessionStorage): a new tab starts at the chooser,
// a reload keeps the choice. Remembering it is only a convenience, so storage problems are ignored.
function remembered(): Role | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY)
    return value === 'buyer' || value === 'seller' ? value : null
  } catch {
    return null
  }
}

/**
 * Asks the API who the person is (GET /api/me), then makes sure they have chosen a side.
 * Until both are known it shows a loading card, an error card or the buyer/seller chooser
 * instead of the app.
 */
export default function RoleProvider({ children }: { children: ReactNode }) {
  const meState = useAsync(() => api.getMe(), [])
  const [chosen, setChosen] = useState<Role | null>(remembered)
  const navigate = useNavigate()
  const { pathname } = useLocation()

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

  function setRole(next: Role) {
    if (!me.roles.includes(next)) return
    setChosen(next)
    try {
      sessionStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }

  // The side this tab is using. An account with one side has nothing to choose, so it skips the chooser.
  // A remembered side only counts if the account still has it.
  const role: Role | null = chosen && me.roles.includes(chosen) ? chosen : me.roles.length === 1 ? me.roles[0] : null

  if (role === null) {
    return (
      <RoleChooser
        me={me}
        onChoose={(next) => {
          setRole(next)
          // Start page for that side, unless they opened a link inside their own side.
          const otherSidePage = pathname.startsWith(next === 'buyer' ? '/seller' : '/buyer')
          if (pathname === '/' || otherSidePage) navigate(homePath(next), { replace: true })
        }}
      />
    )
  }

  // The demo data answers differently for a buyer and a seller, and children ask for data as soon
  // as they appear, so this is set during render (it is only a variable, so repeating it is harmless).
  setDemoRole(role)

  return <RoleContext.Provider value={{ me, role }}>{children}</RoleContext.Provider>
}
