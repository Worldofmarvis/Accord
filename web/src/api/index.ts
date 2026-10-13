// The one place screens get their data from.
//   import { api } from '../api'
//   const listings = await api.searchListings({ ... })
//
// VITE_USE_MOCK in web/.env decides whether this is the real back end or the demo data.
import { USE_MOCK } from './config'
import { mockApi } from './mock'
import { realApi } from './real'
import type { Api } from './types'

export const api: Api = USE_MOCK ? mockApi : realApi

export { ApiError, errorMessage } from './errors'
export { POLL_MS, USE_MOCK } from './config'
