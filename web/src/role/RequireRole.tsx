import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { Role } from '../types/me'
import { homePath } from './home'
import { useRole } from './useRole'

/**
 * Wraps a page that belongs to one side. Whoever chose the other side on the first screen is sent
 * to their own start page: a seller never ends up on a buyer page, and the other way round.
 * This only hides pages: the API must still refuse the data itself.
 */
export default function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const state = useRole()
  if (state.role !== role) return <Navigate to={homePath(state.role)} replace />
  return <>{children}</>
}
