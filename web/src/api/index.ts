// The one place screens get their data from.
//   import { api } from '../api'
//   const listings = await api.searchListings({ ... })
//
// VITE_USE_MOCK in web/.env decides whether this is the real back end or the demo data.
import { USE_MOCK } from './config'
import { mockApi, setMockRole } from './mock'
import { realApi } from './real'
import type { Api } from './types'
import type { Role } from '../types/me'

export const api: Api = USE_MOCK ? mockApi : realApi

/**
 * Demo only: tells the built-in demo data which side the person is viewing, because the real
 * back end learns that from who is signed in. Does nothing when the real API is used.
 */
export function setDemoRole(role: Role) {
  if (USE_MOCK) setMockRole(role)
}

export { ApiError, errorMessage } from './errors'
export { PAYPAL_CLIENT_ID, POLL_MS, USE_MOCK } from './config'
