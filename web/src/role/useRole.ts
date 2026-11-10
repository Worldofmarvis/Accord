import { useContext } from 'react'
import { RoleContext, type RoleState } from './context'

/** The signed-in person and the side they are viewing. Only works below <RoleProvider>. */
export function useRole(): RoleState {
  const value = useContext(RoleContext)
  if (!value) throw new Error('useRole must be used inside <RoleProvider>')
  return value
}
