// Settings for talking to the back end. Change them in web/.env, not here.

/** Use the built-in demo data instead of the real API. Default: true, until the back end is ready. */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

/** PayPal sandbox client ID (public, safe in the browser). Never put the PayPal secret here. */
export const PAYPAL_CLIENT_ID = (import.meta.env.VITE_PAYPAL_CLIENT_ID ?? '').trim()

/**
 * Where the PayPal JS SDK v6 is loaded from. Defaults to the sandbox address, so a sandbox client ID
 * gives sandbox payments. For live payments set VITE_PAYPAL_SDK_URL to PayPal's live v6 address.
 */
export const PAYPAL_SDK_URL = import.meta.env.VITE_PAYPAL_SDK_URL || 'https://www.sandbox.paypal.com/web-sdk/v6/core'

/** Where the API lives, without a trailing slash. */
export const API_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, '')

/** How often live screens (negotiation, chat) ask for updates. */
const poll = Number(import.meta.env.VITE_POLL_MS)
export const POLL_MS = Number.isFinite(poll) && poll >= 500 ? poll : 3000
