'use client'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCartStore } from '@/lib/cart-store'
import { Suspense } from 'react'

const navy = '#25295B'
const border = '#e5e2db'
const muted = '#6b6b7b'
const cream = '#FBF9F3'

function SuccessContent() {
  const params = useSearchParams()
  const orderNumber = params.get('order')
  const { clearCart, address } = useCartStore()

  useEffect(() => { clearCart() }, [clearCart])

  return (
    <div style={{ maxWidth: 440, margin: '0 auto', textAlign: 'center', paddingTop: 48 }}>
      <div style={{ width: 52, height: 52, background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h1 style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 700, fontSize: '1.3rem', color: navy, marginBottom: 6 }}>
        Order confirmed
      </h1>
      {orderNumber && orderNumber !== 'pending' && (
        <p style={{ color: muted, fontSize: 13, marginBottom: 4 }}>Order #{orderNumber}</p>
      )}
      <p style={{ color: muted, fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
        Payment received. A formal invoice will be sent to{' '}
        {address?.email ? <strong style={{ color: navy }}>{address.email}</strong> : 'you'} shortly.
      </p>

      <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 10, padding: 18, marginBottom: 24, textAlign: 'left' }}>
        <p style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 600, fontSize: 13, color: navy, marginBottom: 10 }}>What happens next</p>
        {[
          'Invoice emailed to you from Orderspace',
          'Order picked, roasted and dispatched from Cambridge, NZ',
          'DHL tracking number sent on dispatch',
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 7, fontSize: 13, color: muted }}>
            <span style={{ width: 18, height: 18, background: cream, border: `1px solid ${border}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, color: navy, fontWeight: 600 }}>
              {i + 1}
            </span>
            {step}
          </div>
        ))}
      </div>

      <a
        href="https://slowcoffee.orderspace.com/login"
        style={{
          display: 'block', width: '100%', background: navy, color: '#fff',
          borderRadius: 0, padding: '13px 0', fontFamily: 'var(--font-montserrat)',
          fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none',
          textAlign: 'center', letterSpacing: '0.02em',
        }}
      >
        Back to wholesale portal
      </a>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 80, color: '#6b6b7b' }}>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  )
}
