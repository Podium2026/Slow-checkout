'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useCartStore } from '@/lib/cart-store'
import { Steps } from '@/components/steps'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function CheckoutForm({ total, currency }: { total: number; currency: string }) {
  const router = useRouter()
  const stripe = useStripe()
  const elements = useElements()
  const { items, address, selectedRate, setStripePaymentIntentId } = useCartStore()
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)
    setError('')

    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message ?? 'Payment failed')
      setProcessing(false)
      return
    }

    // Create order in Orderspace
    const intentRes = await fetch('/api/payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountNZD: total,
        customerEmail: address?.email,
        description: `SL.OW Coffee wholesale — ${items.length} product(s)`,
      }),
    })
    const intentData = await intentRes.json()
    if (intentData.error) {
      setError(intentData.error)
      setProcessing(false)
      return
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret: intentData.clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/success?payment_intent=${intentData.paymentIntentId}`,
      },
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed')
      setProcessing(false)
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      setStripePaymentIntentId(paymentIntent.id)

      // Create Orderspace order
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: paymentIntent.id,
          cart: { items },
          address,
          selectedRate,
        }),
      })
      const orderData = await orderRes.json()

      if (!orderData.success) {
        // Payment succeeded but order creation failed — still go to success with a note
        console.error('Order creation issue:', orderData.error)
      }

      router.push(`/success?order=${orderData.order?.order?.number ?? 'pending'}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h2 className="font-medium text-stone-900 mb-4">Card details</h2>
        <PaymentElement />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-stone-900 text-white py-3.5 rounded-xl font-medium text-base hover:bg-stone-700 transition-colors disabled:opacity-50"
      >
        {processing ? 'Processing...' : `Pay ${currency} $${total.toFixed(2)}`}
      </button>

      <p className="text-xs text-stone-400 text-center">
        Secured by Stripe. A formal invoice will be emailed to you after payment.
      </p>
    </form>
  )
}

export default function PaymentPage() {
  const router = useRouter()
  const { items, address, selectedRate, subtotal, totalUnits } = useCartStore()
  const [clientSecret, setClientSecret] = useState('')
  const [loading, setLoading] = useState(true)

  const sub = subtotal()
  const shipping = selectedRate?.totalPrice ?? 0
  const total = sub + shipping
  const currency = selectedRate?.currency ?? 'NZD'
  const units = totalUnits()

  useEffect(() => {
    if (!items.length || !address || !selectedRate) {
      router.replace('/order')
      return
    }
    // Pre-create intent for the payment element to render
    fetch('/api/payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountNZD: total,
        customerEmail: address.email,
        description: `SL.OW Coffee wholesale — ${items.length} product(s)`,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        setClientSecret(d.clientSecret)
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading || !clientSecret) {
    return (
      <div>
        <Steps current={2} />
        <div className="text-stone-400 text-sm py-12 text-center">Preparing payment...</div>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <Steps current={2} />
        <h1 className="text-2xl font-semibold mb-1">Payment</h1>
        <p className="text-stone-500 text-sm mb-6">
          Pay now to confirm your order. Invoice sent after.
        </p>

        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm total={total} currency={currency} />
        </Elements>
      </div>

      {/* Summary sidebar */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="font-medium text-stone-900 mb-3">Order summary</h2>
          <div className="space-y-1.5">
            {items.map((item) => (
              <div key={item.sku} className="flex justify-between text-sm">
                <span className="text-stone-600">
                  {item.name}{item.variantName ? ` — ${item.variantName}` : ''} × {item.quantity}
                </span>
                <span>${(item.pricePerUnit * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-stone-100 mt-3 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Subtotal</span>
              <span>${sub.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">{selectedRate?.productName}</span>
              <span>${shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-stone-400">
              <span>Shipping per unit</span>
              <span>${units > 0 ? (shipping / units).toFixed(2) : '0.00'}</span>
            </div>
          </div>
          <div className="border-t border-stone-100 mt-3 pt-3 flex justify-between font-semibold">
            <span>Total</span>
            <span>{currency} ${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 text-xs text-stone-500 space-y-1">
          <div><span className="font-medium text-stone-700">Delivering to:</span></div>
          <div>{address?.companyName}</div>
          <div>{address?.line1}{address?.line2 ? `, ${address.line2}` : ''}</div>
          <div>{address?.city} {address?.postalCode}, {address?.country}</div>
          <div className="pt-1">{address?.email}</div>
        </div>
      </div>
    </div>
  )
}
