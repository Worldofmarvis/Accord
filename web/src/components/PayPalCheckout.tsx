import { useEffect, useRef, useState } from 'react'
import { api, errorMessage, PAYPAL_CLIENT_ID, USE_MOCK } from '../api'
import { usd } from '../lib/format'
import { loadPayPalSdk } from '../lib/paypal'
import type { Payment } from '../types/marketplace'

type Props = {
  negotiationId: string
  /** Shown to the buyer. The server decides the real amount. */
  amount: number
  onPaid: (payment: Payment) => void
}

type Notice = { tone: 'warning' | 'danger'; text: string }

const CANCELLED: Notice = { tone: 'warning', text: 'Payment cancelled. Nothing was charged. You can try again.' }
// Nothing is marked as paid unless the server says PayPal confirmed it, so this wording stays true
// even if PayPal reports the problem after the buyer approved.
const FAILED: Notice = {
  tone: 'danger',
  text: "PayPal couldn't complete the payment. Nothing is marked as paid unless PayPal confirms it. Please try again.",
}

/**
 * The buyer's pay step.
 * - Real mode: PayPal's own button (JS SDK v6). The server creates and captures the order, so the amount cannot be changed here.
 * - Demo mode (VITE_USE_MOCK=true): one button that runs the same two calls against the demo data.
 */
export default function PayPalCheckout(props: Props) {
  if (USE_MOCK) return <DemoCheckout {...props} />
  if (!PAYPAL_CLIENT_ID) {
    return (
      <div className="notice notice-danger" role="alert">
        PayPal isn&apos;t set up. Add a sandbox client ID as VITE_PAYPAL_CLIENT_ID in web/.env and restart the app.
      </div>
    )
  }
  return <PayPalButtonsCheckout {...props} />
}

function PayPalButtonsCheckout({ negotiationId, amount, onPaid }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [sdk, setSdk] = useState<'loading' | 'ready' | 'unavailable' | 'failed'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [capturing, setCapturing] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  // The button is drawn once, so it reads the latest props through this ref.
  const latest = useRef({ negotiationId, onPaid })
  useEffect(() => {
    latest.current = { negotiationId, onPaid }
  })

  useEffect(() => {
    let cancelled = false
    const holder = box.current

    async function setup() {
      try {
        // 1. Load the v6 script and create the SDK instance with the public sandbox client ID.
        const paypal = await loadPayPalSdk()
        const instance = await paypal.createInstance({ clientId: PAYPAL_CLIENT_ID, components: ['paypal-payments'] })

        // 2. Only show the button if PayPal is allowed for this browser and account.
        const methods = await instance.findEligibleMethods()
        if (cancelled) return
        if (!methods.isEligible('paypal')) {
          setSdk('unavailable')
          return
        }

        // 3. A one-time payment session. The server captures the order, so `paid` comes from its answer.
        const session = await instance.createPayPalOneTimePaymentSession({
          onApprove: async ({ orderId }) => {
            setCapturing(true)
            try {
              latest.current.onPaid(await api.capturePayment(latest.current.negotiationId, orderId))
            } catch (e) {
              setNotice({ tone: 'danger', text: errorMessage(e) })
            } finally {
              setCapturing(false)
            }
          },
          onCancel: () => setNotice(CANCELLED),
          // Keep a more specific message (from createOrder) if there already is one.
          onError: () => setNotice((n) => n ?? FAILED),
        })
        if (cancelled || !holder) return

        // 4. PayPal's button. On click, our server creates the order and PayPal opens with it.
        const button = document.createElement('paypal-button')
        let starting = false
        button.addEventListener('click', async () => {
          if (starting) return
          starting = true
          try {
            const orderPromise = (async () => {
              setNotice(null)
              try {
                return { orderId: (await api.createPaymentOrder(latest.current.negotiationId)).orderId }
              } catch (e) {
                setNotice({ tone: 'danger', text: errorMessage(e) })
                throw e
              }
            })()
            await session.start({ presentationMode: 'auto' }, orderPromise)
          } catch {
            // The reason is already on screen (createOrder) or arrives through onError.
            if (!cancelled) setNotice((n) => n ?? FAILED)
          } finally {
            starting = false
          }
        })
        holder.replaceChildren(button)
        setSdk('ready')
      } catch {
        if (!cancelled) setSdk('failed')
      }
    }
    void setup()

    return () => {
      cancelled = true
      holder?.replaceChildren()
    }
  }, [attempt])

  return (
    <div className="paypal-checkout">
      <p className="muted caption">
        You will pay {usd(amount)}, the agreed price. PayPal sandbox only, so no real money moves.
      </p>

      {sdk === 'loading' && (
        <p className="muted" role="status">
          Loading PayPal...
        </p>
      )}
      {sdk === 'unavailable' && (
        <div className="notice notice-warning" role="alert">
          PayPal isn&apos;t available for this browser or account.
        </div>
      )}
      {sdk === 'failed' && (
        <div className="notice notice-danger" role="alert">
          <p>PayPal couldn&apos;t be loaded. Check your connection and try again.</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSdk('loading')
              setAttempt((n) => n + 1)
            }}
          >
            Try again
          </button>
        </div>
      )}

      {/* PayPal's button is added in here. Hidden while we confirm the payment so it cannot be paid twice. */}
      <div ref={box} className="paypal-buttons" hidden={capturing} />

      {capturing && (
        <p className="notice notice-warning" role="status">
          Confirming your payment with PayPal. Please don&apos;t close this page.
        </p>
      )}
      {notice && !capturing && (
        <div className={`notice notice-${notice.tone} notice-inline`} role="alert">
          {notice.text}
        </div>
      )}
    </div>
  )
}

function DemoCheckout({ negotiationId, amount, onPaid }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function pay() {
    setBusy(true)
    setError(null)
    try {
      const { orderId } = await api.createPaymentOrder(negotiationId)
      onPaid(await api.capturePayment(negotiationId, orderId))
    } catch (e) {
      setError(e)
      setBusy(false)
    }
  }

  return (
    <div className="paypal-checkout">
      <button type="button" className="btn btn-primary btn-lg" onClick={pay} disabled={busy}>
        {busy ? 'Processing payment...' : `Pay ${usd(amount)} (demo checkout)`}
      </button>
      <p className="muted caption">
        Demo mode: the payment is simulated. For real PayPal sandbox buttons set VITE_USE_MOCK=false and
        VITE_PAYPAL_CLIENT_ID in web/.env.
      </p>
      {error != null && (
        <div className="notice notice-danger notice-inline" role="alert">
          {errorMessage(error)}
        </div>
      )}
    </div>
  )
}
