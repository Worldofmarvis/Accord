// Loads the PayPal JavaScript SDK on demand (no npm package needed) and describes the small part we use.
// Sandbox or live is decided by the client ID: a sandbox client ID gives sandbox checkout.

export type PayPalButtonsConfig = {
  style?: { layout?: 'vertical' | 'horizontal'; shape?: 'rect' | 'pill'; label?: 'pay' | 'paypal' | 'checkout'; height?: number }
  /** Ask our server to create the order and return its ID. The amount is decided there, never here. */
  createOrder: () => Promise<string>
  /** The buyer approved in the PayPal window. Ask our server to capture the order. */
  onApprove: (data: { orderID: string }) => Promise<void>
  onCancel?: () => void
  onError?: (error: unknown) => void
}

export type PayPalButtons = {
  isEligible(): boolean
  render(container: HTMLElement): Promise<void>
  close(): Promise<void>
}

export type PayPalNamespace = { Buttons(config: PayPalButtonsConfig): PayPalButtons }

declare global {
  interface Window {
    paypal?: PayPalNamespace
  }
}

let loading: Promise<PayPalNamespace> | null = null

export function loadPayPalSdk(clientId: string): Promise<PayPalNamespace> {
  if (window.paypal) return Promise.resolve(window.paypal)
  if (loading) return loading

  loading = new Promise<PayPalNamespace>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?${new URLSearchParams({
      'client-id': clientId,
      currency: 'USD',
      intent: 'capture',
      components: 'buttons',
    })}`
    script.async = true
    script.onload = () => {
      if (window.paypal) resolve(window.paypal)
      else fail(new Error('PayPal did not start.'))
    }
    script.onerror = () => fail(new Error("PayPal couldn't be loaded."))
    function fail(error: Error) {
      loading = null // allow a retry
      script.remove()
      reject(error)
    }
    document.head.appendChild(script)
  })
  return loading
}
