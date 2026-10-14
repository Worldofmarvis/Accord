import { createContext } from 'react'
import type { Me, Role } from '../types/me'

export type RoleState = {
  me: Me
  /** Which side the person is looking at right now. Always one of `me.roles`. */
  role: Role
  setRole: (role: Role) => void
}

export const RoleContext = createContext<RoleState | null>(null)
