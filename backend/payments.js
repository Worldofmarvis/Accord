const BASE = 'https://api-m.sandbox.paypal.com'
const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env

export const paypalMode = () => (PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET ? 'sandbox' : 'mock')
export const paypalClientId = () => PAYPAL_CLIENT_ID || null

async function accessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status})`)
  return (await res.json()).access_token
}

export async function createOrder(amount, description, referenceId) {
  if (paypalMode() === 'mock') return { id: `MOCK-${referenceId}`, status: 'CREATED' }
  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: String(referenceId),
        description,
        amount: { currency_code: 'USD', value: Number(amount).toFixed(2) },
      }],
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `PayPal create order failed (${res.status})`)
  return data
}

export async function captureOrder(orderId) {
  if (paypalMode() === 'mock') return { id: orderId, status: 'COMPLETED' }
  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `PayPal capture failed (${res.status})`)
  return data
}