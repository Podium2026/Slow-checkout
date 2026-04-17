'use client'
import { useState } from 'react'
import Image from 'next/image'
import type { DHLRate } from '@/lib/dhl'

const COUNTRIES = [
  { code: 'NZ', name: 'New Zealand' },
  { code: 'AU', name: 'Australia' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong SAR' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'DK', name: 'Denmark' },
  { code: 'NO', name: 'Norway' },
  { code: 'KR', name: 'South Korea' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'CN', name: 'China' },
  { code: 'AE', name: 'UAE' },
]

// Volumetric weight: DHL uses dim factor 5000 (cm³/kg)
// Standard bag dims: 250g ≈ 10×7×3cm, 500g ≈ 14×9×4cm, 1kg ≈ 18×11×5cm
const BAG_SIZES = [
  { label: '250g bags', weightKg: 0.28, vol: (10 * 7 * 3) / 5000 },
  { label: '500g bags', weightKg: 0.54, vol: (14 * 9 * 4) / 5000 },
  { label: '1kg bags', weightKg: 1.06, vol: (18 * 11 * 5) / 5000 },
]

export default function EstimatePage() {
  const [country, setCountry] = useState('AU')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [bags, setBags] = useState<Record<string, number>>({ '250g bags': 0, '500g bags': 0, '1kg bags': 0 })
  const [rates, setRates] = useState<DHLRate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fetched, setFetched] = useState(false)

  const totalWeightKg = BAG_SIZES.reduce((sum, s) => sum + (bags[s.label] ?? 0) * s.weightKg, 0)
  const totalVolKg = BAG_SIZES.reduce((sum, s) => sum + (bags[s.label] ?? 0) * s.vol, 0)
  const chargeableKg = Math.max(totalWeightKg, totalVolKg, 0.1)
  const totalBags = Object.values(bags).reduce((a, b) => a + b, 0)

  const fetchRates = async () => {
    if (!city.trim() || !postalCode.trim()) {
      setError('Please enter your city and postal code.')
      return
    }
    if (totalBags === 0) {
      setError('Please add at least one bag to your estimate.')
      return
    }
    setError('')
    setLoading(true)
    setFetched(false)
    try {
      const res = await fetch('/api/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toCity: city, toPostalCode: postalCode, toCountry: country, weightKg: chargeableKg }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setRates(data.rates)
      setFetched(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const navy = '#25295B'
  const cream = '#FBF9F3'
  const border = '#e5e2db'
  const muted = '#6b6b7b'

  return (
    <div style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', color: navy }}>
      <main style={{ maxWidth: 680, margin: '0 auto' }}>
        {/* Title */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 400, margin: 0, letterSpacing: '-0.01em' }}>Shipping Estimate</h1>
          <p style={{ color: muted, fontSize: '0.9rem', marginTop: 8 }}>
            Get a live DHL shipping quote for your wholesale order before you place it.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 24 }}>
          {/* Delivery location */}
          <div style={{ backgroundColor: '#fff', border: `1px solid ${border}`, borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: muted, margin: '0 0 16px' }}>
              Delivery Location
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: muted, display: 'block', marginBottom: 6 }}>Country</label>
                <select
                  value={country}
                  onChange={(e) => { setCountry(e.target.value); setRates([]); setFetched(false) }}
                  style={{ width: '100%', border: `1px solid ${border}`, borderRadius: 8, padding: '9px 12px', fontSize: '0.875rem', color: navy, backgroundColor: '#fff', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b6b7b' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                >
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: muted, display: 'block', marginBottom: 6 }}>Postal / ZIP code</label>
                <input
                  value={postalCode}
                  onChange={(e) => { setPostalCode(e.target.value); setFetched(false) }}
                  placeholder={country === 'NZ' ? '6011' : country === 'AU' ? '2000' : country === 'GB' ? 'EC1A 1BB' : ''}
                  style={{ width: '100%', border: `1px solid ${border}`, borderRadius: 8, padding: '9px 12px', fontSize: '0.875rem', color: navy, boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: muted, display: 'block', marginBottom: 6 }}>City</label>
              <input
                value={city}
                onChange={(e) => { setCity(e.target.value); setFetched(false) }}
                placeholder="e.g. Sydney"
                style={{ width: '100%', border: `1px solid ${border}`, borderRadius: 8, padding: '9px 12px', fontSize: '0.875rem', color: navy, boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Order size */}
          <div style={{ backgroundColor: '#fff', border: `1px solid ${border}`, borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: muted, margin: '0 0 16px' }}>
              Order Size
            </h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {BAG_SIZES.map((s) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 400 }}>{s.label}</div>
                    <div style={{ fontSize: '0.75rem', color: muted }}>{s.weightKg * 1000}g per bag</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: `1px solid ${border}`, borderRadius: 8, overflow: 'hidden' }}>
                    <button
                      onClick={() => { setBags((b) => ({ ...b, [s.label]: Math.max(0, (b[s.label] ?? 0) - 1) })); setFetched(false) }}
                      style={{ width: 36, height: 36, border: 'none', background: 'none', fontSize: '1.1rem', cursor: 'pointer', color: navy }}
                    >−</button>
                    <span style={{ width: 40, textAlign: 'center', fontSize: '0.875rem', fontWeight: 500 }}>{bags[s.label] ?? 0}</span>
                    <button
                      onClick={() => { setBags((b) => ({ ...b, [s.label]: (b[s.label] ?? 0) + 1 })); setFetched(false) }}
                      style={{ width: 36, height: 36, border: 'none', background: 'none', fontSize: '1.1rem', cursor: 'pointer', color: navy }}
                    >+</button>
                  </div>
                </div>
              ))}
            </div>

            {totalBags > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: muted }}>
                <span>{totalBags} bag{totalBags !== 1 ? 's' : ''}</span>
                <span>Chargeable weight: {chargeableKg.toFixed(2)} kg</span>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <p style={{ color: '#c0392b', fontSize: '0.85rem', margin: 0 }}>{error}</p>
          )}

          {/* Get rates button */}
          <button
            onClick={fetchRates}
            disabled={loading}
            style={{ backgroundColor: navy, color: '#fff', border: 'none', borderRadius: 10, padding: '14px 24px', fontSize: '0.9rem', fontWeight: 400, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, letterSpacing: '0.02em' }}
          >
            {loading ? 'Getting live rates…' : 'Get shipping estimate'}
          </button>

          {/* Results */}
          {fetched && rates.length > 0 && (
            <div style={{ backgroundColor: '#fff', border: `1px solid ${border}`, borderRadius: 12, padding: 24 }}>
              <h2 style={{ fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: muted, margin: '0 0 16px' }}>
                DHL Shipping Options
              </h2>
              <div style={{ display: 'grid', gap: 10 }}>
                {rates.map((rate) => {
                  const eta = rate.deliveryDate
                    ? new Date(rate.deliveryDate).toLocaleDateString('en-NZ', { weekday: 'short', month: 'short', day: 'numeric' })
                    : `~${rate.transitDays} business day${rate.transitDays !== 1 ? 's' : ''}`
                  const perBag = totalBags > 0 ? rate.totalPrice / totalBags : 0
                  return (
                    <div key={rate.productCode} style={{ border: `1px solid ${border}`, borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{rate.productName}</div>
                        <div style={{ fontSize: '0.75rem', color: muted, marginTop: 3 }}>Est. arrival: {eta}</div>
                        <div style={{ fontSize: '0.75rem', color: muted, marginTop: 2 }}>
                          {rate.currency} {perBag.toFixed(2)} per bag
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>{rate.currency} {rate.totalPrice.toFixed(2)}</div>
                        <div style={{ fontSize: '0.7rem', color: muted, marginTop: 2 }}>total freight</div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p style={{ fontSize: '0.75rem', color: muted, marginTop: 16, lineHeight: 1.5 }}>
                * Rates are indicative and based on chargeable weight (actual vs volumetric). Final rates confirmed at checkout.
                Local duties, VAT, and import taxes are not included.
              </p>
            </div>
          )}

          {fetched && rates.length === 0 && (
            <div style={{ backgroundColor: '#fff', border: `1px solid ${border}`, borderRadius: 12, padding: 24, textAlign: 'center', color: muted, fontSize: '0.875rem' }}>
              No shipping rates available for this destination. Contact us directly.
            </div>
          )}
        </div>

        {/* Footer note */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${border}` }}>
          <p style={{ fontSize: '0.8rem', color: muted, lineHeight: 1.6 }}>
            Ready to place your order?{' '}
            <a href="https://slow.orderspace.com" style={{ color: navy, textDecoration: 'underline' }}>
              Visit our wholesale store
            </a>
            . Questions about shipping?{' '}
            <a href="mailto:hello@slow.coffee" style={{ color: navy, textDecoration: 'underline' }}>
              Get in touch
            </a>.
          </p>
        </div>
      </main>
    </div>
  )
}

