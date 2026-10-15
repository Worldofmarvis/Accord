import { createContext } from 'react'
import type { Me, Role } from '../types/me'

export type RoleState = {
  me: Me
  /** The side chosen on the first screen (or the only side the account has). It does not change in this tab. */
  role: Role
}

export const RoleContext = createContext<RoleState | null>(null)
