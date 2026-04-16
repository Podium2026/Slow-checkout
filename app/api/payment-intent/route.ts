import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })
}

export async function POST(req: NextRequest) {
  try {
    const { amountNZD, customerEmail, description } = await req.json()

    if (!amountNZD || !customerEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const amountCents = Math.round(amountNZD * 100)

    const intent = await getStripe().paymentIntents.create({
      amount: amountCents,
      currency: 'nzd',
      receipt_email: customerEmail,
      description: description ?? 'SL.OW Coffee wholesale order',
      automatic_payment_methods: { enabled: true },
      metadata: {
        source: 'slow-checkout',
      },
    })

    return NextResponse.json({ clientSecret: intent.client_secret, paymentIntentId: intent.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
