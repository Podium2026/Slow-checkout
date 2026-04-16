import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getOrder, markOrderPaid } from '@/lib/orderspace'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })
}

export async function POST(req: NextRequest) {
  try {
    const { paymentIntentId, orderId, shippingService, shippingCost } = await req.json()

    // 1. Verify payment succeeded with Stripe
    const intent = await getStripe().paymentIntents.retrieve(paymentIntentId)
    if (intent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not confirmed' }, { status: 402 })
    }

    // 2. Verify order exists in Orderspace
    await getOrder(orderId)

    // 3. Update order with payment + shipping info
    await markOrderPaid(orderId, paymentIntentId, shippingService, shippingCost)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('complete-order error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
