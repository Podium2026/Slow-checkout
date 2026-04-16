import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Customer groups that should use the DHL checkout.
// New Zealand Wholesale Partners are skipped — they pay via bank transfer.
const INTERNATIONAL_GROUPS = [
  'Partners - Asia',
  'Partners - AUS',
  'Partners - UK/Europe',
  'Partners - USA/Canada',
]

// Orderspace fires order.created when a customer submits an order.
// We send international partners a payment link with live DHL rate included.
export async function POST(req: NextRequest) {
  const signingKey = process.env.ORDERSPACE_WEBHOOK_SIGNING_KEY
  const body = await req.text()

  // Validate webhook signature if signing key is configured
  if (signingKey) {
    const signature = req.headers.get('x-orderspace-signature')
    const expected = crypto.createHmac('sha256', signingKey).update(body).digest('base64')
    if (signature !== expected) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: any
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Orderspace can batch multiple events in one request
  const events = Array.isArray(payload) ? payload : [payload]

  for (const event of events) {
    if (event.event === 'order.created') {
      const order = event.data
      const customerGroup: string = order.customer_group ?? ''
      const isInternational = INTERNATIONAL_GROUPS.includes(customerGroup)

      if (!isInternational) {
        // NZ domestic — let Orderspace handle invoice + bank transfer as normal
        console.log(`[webhook] order #${order.number} skipped (group: "${customerGroup}" — domestic)`)
        continue
      }

      const email = order.email_addresses?.orders
      const orderNumber = order.number
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002'
      const paymentLink = `${appUrl}/pay/${orderNumber}`

      console.log(`[webhook] order.created #${orderNumber} → ${email} (group: "${customerGroup}")`)
      console.log(`[webhook] payment link: ${paymentLink}`)

      // TODO: send email to customer with paymentLink
      // e.g. using Resend, Postmark, or SendGrid:
      // await sendEmail({ to: email, subject: 'Complete your SL.OW Coffee order', body: ... })
    }
  }

  return NextResponse.json({ ok: true })
}
