// Loads the PayPal JavaScript SDK v6 on demand (no npm package needed) and describes the small part we use.
// Docs: https://developer.paypal.com/checkout/integrate
//
// v6 in short: load one "core" script, create an SDK instance with the client ID, check that PayPal
// is allowed, create a one-time payment session, and draw a <paypal-button>. When the buyer clicks,
// we start the session and hand it a promise for the order our server creates.
import { PAYPAL_SDK_URL } from '../api/config'

export type PayPalSession = {
  /** Opens PayPal. `orderPromise` resolves with `{ orderId }` once our server has created the order. */
  start(options: { presentationMode: 'auto' }, orderPromise: Promise<{ orderId: string }>): Promise<void>
}

export type PayPalSessionCallbacks = {
  /** The buyer approved in the PayPal window. Ask our server to capture the order. */
  onApprove: (data: { orderId: string }) => Promise<void> | void
  onCancel: (data?: unknown) => void
  onError: (error: Error) => void
}

export type PayPalSdkInstance = {
  findEligibleMethods(): Promise<{ isEligible(method: string): boolean }>
  createPayPalOneTimePaymentSession(callbacks: PayPalSessionCallbacks): Promise<PayPalSession>
}

export type PayPalNamespace = {
  createInstance(options: { clientId: string; components: string[] }): Promise<PayPalSdkInstance>
}

declare global {
  interface Window {
    paypal?: PayPalNamespace
  }
}

const LOAD_TIMEOUT_MS = 15_000
let loading: Promise<PayPalNamespace> | null = null

/** Adds the SDK script once and resolves with `window.paypal`. A failed load can be tried again. */
export function loadPayPalSdk(): Promise<PayPalNamespace> {
  if (window.paypal) return Promise.resolve(window.paypal)
  if (loading) return loading

  loading = new Promise<PayPalNamespace>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = PAYPAL_SDK_URL
    script.async = true

    const timer = setTimeout(() => fail(new Error('PayPal took too long to load.')), LOAD_TIMEOUT_MS)
    function fail(error: Error) {
      clearTimeout(timer)
      loading = null // allow a retry
      script.remove()
      reject(error)
    }

    script.onload = () => {
      clearTimeout(timer)
      if (window.paypal) resolve(window.paypal)
      else fail(new Error('PayPal did not start.'))
    }
    script.onerror = () => fail(new Error("PayPal couldn't be loaded."))
    document.head.appendChild(script)
  })
  return loading
}
