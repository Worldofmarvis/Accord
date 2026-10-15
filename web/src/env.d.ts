/// <reference types="vite/client" />

// Settings read from web/.env. See web/.env.example and docs/API.md.
interface ImportMetaEnv {
  /** "false" talks to the real API. Anything else uses the built-in demo data. */
  readonly VITE_USE_MOCK?: string
  /** Where the API lives. Defaults to "/api". */
  readonly VITE_API_URL?: string
  /** PayPal sandbox client ID for the checkout buttons. Needed when VITE_USE_MOCK is "false". */
  readonly VITE_PAYPAL_CLIENT_ID?: string
  /** Optional: a different PayPal JS SDK v6 address. Defaults to the sandbox one. */
  readonly VITE_PAYPAL_SDK_URL?: string
  /** Polling interval in milliseconds. Defaults to 3000. */
  readonly VITE_POLL_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
