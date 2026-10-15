import { request } from './http'
import type { Role } from '../types/me'

export type DemoUser = { id: string; name: string; role: Role }

/** The people the demo sign-in offers (GET /users/demo). Real mode only. */
export async function listDemoUsers(): Promise<DemoUser[]> {
  const rows = await request<{ id: number | string; name: string; role: Role }[]>('/users/demo')
  return rows.map((u) => ({ id: String(u.id), name: u.name, role: u.role }))
}
