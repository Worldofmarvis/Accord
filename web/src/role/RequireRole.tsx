import { useEffect, type ReactNode } from 'react'
import type { Role } from '../types/me'
import { useRole } from './useRole'

/**
 * Wraps a page that belongs to one side. A person with both roles who opens the page
 * (for example from a link) is switched to that side. A person without the role sees a
 * message instead. This only hides pages: the API must still refuse the data itself.
 */
export default function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const state = useRole()
  const allowed = state.me.roles.includes(role)
  const { setRole } = state

  useEffect(() => {
    if (allowed) setRole(role)
  }, [allowed, role, setRole])

  if (!allowed) {
    return (
      <div className="state-card state-card-error" role="alert">
        <p>This page is for {role}s, and your account does not have that role.</p>
      </div>
    )
  }
  return <>{children}</>
}
