export type Role = 'buyer' | 'seller'

/** The signed-in person, from GET /api/me (see docs/API.md). */
export type Me = {
  id: string
  name: string
  roles: Role[]
}
