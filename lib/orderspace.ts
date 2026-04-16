const ORDERSPACE_API = 'https://api.orderspace.com/v1'
const IDENTITY_URL = 'https://identity.orderspace.com/oauth/token'

let cachedToken: { token: string; expiresAt: number } | null = null

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token
  }
  const res = await fetch(IDENTITY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.ORDERSPACE_CLIENT_ID,
      client_secret: process.env.ORDERSPACE_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  })
  if (!res.ok) throw new Error(`Orderspace auth failed: ${res.status}`)
  const data = await res.json()
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return cachedToken.token
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await getAccessToken()
  const res = await fetch(`${ORDERSPACE_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Orderspace API error ${res.status}: ${err}`)
  }
  return res.json()
}

export interface OrderLine {
  id: string
  sku: string
  name: string
  quantity: number
  unit_price: number
  sub_total: number
  tax_rate: number
  tax_amount: number
  on_hand: number
  shipping: boolean
}

export interface OSOrder {
  id: string
  number: string
  status: string
  company_name: string
  email_addresses: { orders: string; invoices: string }
  shipping_address: {
    city: string
    postal_code: string
    country: string
    line1: string
    line2: string
    state: string
    company_name: string
    contact_name: string
  }
  order_lines: OrderLine[]
  net_total: number
  gross_total: number
  currency: string
  shipping_type?: string
  internal_note?: string
}

export async function getOrder(orderId: string): Promise<OSOrder> {
  const data = await apiFetch(`/orders/${orderId}`)
  return data.order
}

export async function getOrderByNumber(orderNumber: string): Promise<OSOrder | null> {
  const data = await apiFetch(`/orders?number=${encodeURIComponent(orderNumber)}`)
  return data.orders?.[0] ?? null
}

// Calculate total weight of an order based on product SKU naming conventions
// Since Orderspace weight fields are 0, we infer from SKU/name
export function inferOrderWeightKg(order: OSOrder): number {
  let totalKg = 0
  for (const line of order.order_lines) {
    if (line.shipping) continue
    const sku = (line.sku ?? '').toLowerCase()
    const name = (line.name ?? '').toLowerCase()
    let unitKg = 0.25 // default 200g bag
    if (sku.includes('1kg') || name.includes('1kg') || sku.includes('1000g')) unitKg = 1.1
    else if (sku.includes('500g') || name.includes('500g')) unitKg = 0.55
    else if (sku.includes('200g') || name.includes('200g')) unitKg = 0.25
    totalKg += unitKg * line.quantity
  }
  return Math.max(totalKg, 0.1)
}

// Add shipping as a note on the order and update internal note with Stripe payment ID
export async function markOrderPaid(orderId: string, stripePaymentId: string, shippingService: string, shippingCost: number) {
  return apiFetch(`/orders/${orderId}`, {
    method: 'PUT',
    body: JSON.stringify({
      shipping_type: shippingService,
      internal_note: `Paid at checkout via Stripe. Payment ID: ${stripePaymentId}. Shipping: ${shippingService} $${shippingCost.toFixed(2)}`,
    }),
  })
}
