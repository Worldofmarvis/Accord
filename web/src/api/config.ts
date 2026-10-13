// Settings for talking to the back end. Change them in web/.env, not here.

/** Use the built-in demo data instead of the real API. Default: true, until the back end is ready. */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

/** Where the API lives, without a trailing slash. */
export const API_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, '')

/** How often live screens (negotiation, chat) ask for updates. */
const poll = Number(import.meta.env.VITE_POLL_MS)
export const POLL_MS = Number.isFinite(poll) && poll >= 500 ? poll : 3000
