'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import type { OSOrder } from '@/lib/orderspace'
import type { DHLRate } from '@/lib/dhl'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const navy = '#25295B'
const cream = '#FBF9F3'
const border = '#e5e2db'
const muted = '#6b6b7b'

// ── Payment form ──────────────────────────────────────────────────────────────

function PayForm({
  orderId, total, currency, shippingService, shippingCost, customerEmail, orderNumber,
}: {
  orderId: string; total: number; currency: string; shippingService: string
  shippingCost: number; customerEmail: string; orderNumber: string
}) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setProcessing(true)
    setError('')

    const { error: submitError } = await elements.submit()
    if (submitError) { setError(submitError.message ?? 'Payment failed'); setProcessing(false); return }

    const intentRes = await fetch('/api/payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountNZD: total, customerEmail, description: `SL.OW Coffee order #${orderNumber}` }),
    })
    const intentData = await intentRes.json()
    if (intentData.error) { setError(intentData.error); setProcessing(false); return }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret: intentData.clientSecret,
      confirmParams: { return_url: `${window.location.origin}/success?order=${orderNumber}` },
      redirect: 'if_required',
    })

    if (confirmError) { setError(confirmError.message ?? 'Payment failed'); setProcessing(false); return }

    if (paymentIntent?.status === 'succeeded') {
      await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId: paymentIntent.id, orderId, shippingService, shippingCost }),
      })
      router.push(`/success?order=${orderNumber}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 12, padding: 20 }}>
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        style={{
          width: '100%', background: processing ? '#3a3f7a' : navy, color: '#fff',
          border: 'none', borderRadius: 0, padding: '14px 0',
          fontFamily: 'Helvetica Neue, Helvetica, sans-serif', fontWeight: 400, fontSize: '0.95rem',
          cursor: processing ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
          opacity: processing ? 0.8 : 1,
        }}
      >
        {processing ? 'Processing...' : `Pay ${currency} $${total.toFixed(2)}`}
      </button>

      <p style={{ textAlign: 'center', fontSize: 12, color: muted }}>
        Secured by Stripe · A formal invoice will be emailed after payment
      </p>
    </form>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PayPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const [order, setOrder] = useState<OSOrder | null>(null)
  const [rates, setRates] = useState<DHLRate[]>([])
  const [selectedRate, setSelectedRate] = useState<DHLRate | null>(null)
  const [clientSecret, setClientSecret] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const productLines = order?.order_lines.filter((l) => !l.shipping) ?? []
  const subtotal = productLines.reduce((s, l) => s + l.sub_total, 0)
  const totalUnits = productLines.reduce((s, l) => s + l.quantity, 0)
  const shippingPerUnit = selectedRate && totalUnits > 0 ? selectedRate.totalPrice / totalUnits : 0
  const grandTotal = subtotal + (selectedRate?.totalPrice ?? 0)
  const currency = selectedRate?.currency ?? order?.currency ?? 'NZD'
  const customerEmail = order?.email_addresses?.orders ?? ''

  useEffect(() => {
    if (!orderNumber) return
    fetch(`/api/order?number=${encodeURIComponent(orderNumber)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setOrder(d.order)
      })
      .catch(() => { setError('Could not load order.'); setLoading(false) })
  }, [orderNumber])

  useEffect(() => {
    if (!order) return
    const addr = order.shipping_address
    fetch('/api/rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toCity: addr.city, toPostalCode: addr.postal_code, toCountry: addr.country, weightKg: calcWeight(order) }),
    })
      .then((r) => r.json())
      .then((d) => {
        setRates(d.rates ?? [])
        if (d.rates?.length) setSelectedRate(d.rates[0])
        setLoading(false)
      })
      .catch(() => { setError('Could not fetch shipping rates.'); setLoading(false) })
  }, [order])

  useEffect(() => {
    if (!selectedRate || !order) return
    fetch('/api/payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountNZD: subtotal + selectedRate.totalPrice, customerEmail, description: `SL.OW order #${orderNumber}` }),
    })
      .then((r) => r.json())
      .then((d) => setClientSecret(d.clientSecret ?? ''))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRate?.productCode])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
        <div style={{ width: 24, height: 24, border: `2px solid ${border}`, borderTopColor: navy, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: muted, fontSize: 14 }}>Loading your order...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <p style={{ color: muted, fontSize: 14, marginBottom: 8 }}>{error}</p>
        <p style={{ color: muted, fontSize: 12 }}>
          Need help? Email{' '}
          <a href="mailto:hello@slowcoffee.co.nz" style={{ color: navy }}>hello@slowcoffee.co.nz</a>
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>

      {/* Order card */}
      <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ fontFamily: 'Helvetica Neue, Helvetica, sans-serif', fontWeight: 400, fontSize: '1rem', color: navy, margin: 0 }}>
            Order #{order?.number}
          </h1>
          <span style={{ fontSize: 12, color: muted, background: cream, border: `1px solid ${border}`, borderRadius: 20, padding: '3px 10px' }}>
            {order?.company_name}
          </span>
        </div>

        {/* Line items */}
        <div style={{ marginBottom: 16 }}>
          {productLines.map((line) => (
            <div key={line.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${border}` }}>
              <span style={{ fontSize: 13.5, color: navy }}>
                {line.name}
                <span style={{ color: muted, marginLeft: 6 }}>× {line.quantity}</span>
              </span>
              <span style={{ fontSize: 13.5, color: navy, fontWeight: 400 }}>${line.sub_total.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Subtotal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: muted }}>
          <span>Subtotal ({totalUnits} unit{totalUnits !== 1 ? 's' : ''})</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>

        {/* Shipping */}
        {rates.length > 1 ? (
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 12, color: muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 400 }}>Shipping</p>
            {rates.map((rate) => {
              const perUnit = totalUnits > 0 ? rate.totalPrice / totalUnits : 0
              const isSelected = selectedRate?.productCode === rate.productCode
              const eta = rate.deliveryDate
                ? new Date(rate.deliveryDate).toLocaleDateString('en-NZ', { weekday: 'short', month: 'short', day: 'numeric' })
                : `~${rate.transitDays} days`
              return (
                <button
                  key={rate.productCode}
                  onClick={() => setSelectedRate(rate)}
                  style={{
                    width: '100%', textAlign: 'left', background: isSelected ? cream : '#fff',
                    border: `1.5px solid ${isSelected ? navy : border}`, borderRadius: 8,
                    padding: '10px 12px', marginBottom: 6, cursor: 'pointer', transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 400, color: navy }}>{rate.productName}</span>
                      <span style={{ fontSize: 11, color: muted, marginLeft: 8 }}>{eta}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 13, fontWeight: 400, color: navy }}>${rate.totalPrice.toFixed(2)}</span>
                      <span style={{ fontSize: 11, color: muted, display: 'block' }}>${perUnit.toFixed(2)}/unit</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : selectedRate ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
            <span style={{ color: muted }}>
              {selectedRate.productName}
              <span style={{ fontSize: 11, marginLeft: 6 }}>— ${shippingPerUnit.toFixed(2)}/unit</span>
            </span>
            <span style={{ color: navy, fontWeight: 400 }}>${selectedRate.totalPrice.toFixed(2)}</span>
          </div>
        ) : null}

        {/* Total */}
        {selectedRate && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 2px', borderTop: `1.5px solid ${border}`, marginTop: 6 }}>
            <span style={{ fontFamily: 'Helvetica Neue, Helvetica, sans-serif', fontWeight: 400, fontSize: '1rem', color: navy }}>Total</span>
            <span style={{ fontFamily: 'Helvetica Neue, Helvetica, sans-serif', fontWeight: 400, fontSize: '1rem', color: navy }}>
              {currency} ${grandTotal.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Stripe */}
      {clientSecret && selectedRate ? (
        <Elements stripe={stripePromise} options={{
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: { colorPrimary: navy, colorBackground: '#ffffff', fontFamily: 'Helvetica Neue, Helvetica, sans-serif', borderRadius: '8px' },
          },
        }}>
          <PayForm
            orderId={order!.id}
            total={grandTotal}
            currency={currency}
            shippingService={selectedRate.productName}
            shippingCost={selectedRate.totalPrice}
            customerEmail={customerEmail}
            orderNumber={order!.number}
          />
        </Elements>
      ) : selectedRate ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: muted, fontSize: 13, padding: 24 }}>
          <div style={{ width: 16, height: 16, border: `2px solid ${border}`, borderTopColor: navy, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Preparing payment...
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : null}
    </div>
  )
}

function calcWeight(order: OSOrder): number {
  let total = 0
  for (const line of order.order_lines) {
    if (line.shipping) continue
    const s = ((line.sku ?? '') + (line.name ?? '')).toLowerCase()
    let kg = 0.25
    if (s.includes('1kg') || s.includes('1000g')) kg = 1.1
    else if (s.includes('500g')) kg = 0.55
    total += kg * line.quantity
  }
  return Math.max(total, 0.1)
}
