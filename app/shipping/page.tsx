'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/cart-store'
import { Steps } from '@/components/steps'
import type { DHLRate } from '@/lib/dhl'

const COUNTRIES = [
  { code: 'NZ', name: 'New Zealand' },
  { code: 'AU', name: 'Australia' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
]

export default function ShippingPage() {
  const router = useRouter()
  const { items, address, setAddress, setSelectedRate, totalWeight, totalUnits, subtotal } = useCartStore()

  const [form, setForm] = useState({
    companyName: address?.companyName ?? '',
    contactName: address?.contactName ?? '',
    email: address?.email ?? '',
    phone: address?.phone ?? '',
    line1: address?.line1 ?? '',
    line2: address?.line2 ?? '',
    city: address?.city ?? '',
    state: address?.state ?? '',
    postalCode: address?.postalCode ?? '',
    country: address?.country ?? 'NZ',
  })

  const [rates, setRates] = useState<DHLRate[]>([])
  const [selectedRateCode, setSelectedRateCode] = useState('')
  const [loadingRates, setLoadingRates] = useState(false)
  const [rateError, setRateError] = useState('')

  const units = totalUnits()
  const weight = totalWeight()
  const sub = subtotal()

  const fetchRates = async () => {
    if (!form.city || !form.postalCode || !form.country) {
      setRateError('Please fill in city, postal code, and country.')
      return
    }
    setLoadingRates(true)
    setRateError('')
    try {
      const res = await fetch('/api/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toCity: form.city,
          toPostalCode: form.postalCode,
          toCountry: form.country,
          weightKg: Math.max(weight, 0.1),
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setRates(data.rates)
    } catch (e: any) {
      setRateError(e.message)
    } finally {
      setLoadingRates(false)
    }
  }

  const canContinue = selectedRateCode && form.companyName && form.contactName && form.email && form.line1

  const handleContinue = () => {
    const rate = rates.find((r) => r.productCode === selectedRateCode)!
    setAddress(form)
    setSelectedRate(rate)
    router.push('/payment')
  }

  const selectedRate = rates.find((r) => r.productCode === selectedRateCode)
  const shippingPerUnit = selectedRate && units > 0 ? selectedRate.totalPrice / units : 0

  if (items.length === 0) {
    router.replace('/order')
    return null
  }

  return (
    <div className="pb-28">
      <Steps current={1} />
      <h1 className="text-2xl font-semibold mb-1">Shipping details</h1>
      <p className="text-stone-500 text-sm mb-6">
        Enter your delivery address to get live DHL rates.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Address form */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-3">
          <h2 className="font-medium text-stone-900 mb-1">Delivery address</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-500 block mb-1">Company name *</label>
              <input
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="Your Cafe Ltd"
              />
            </div>
            <div>
              <label className="text-xs text-stone-500 block mb-1">Contact name *</label>
              <input
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                placeholder="Jane Smith"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-500 block mb-1">Email *</label>
              <input
                type="email"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@cafe.com"
              />
            </div>
            <div>
              <label className="text-xs text-stone-500 block mb-1">Phone</label>
              <input
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+64 ..."
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-stone-500 block mb-1">Address line 1 *</label>
            <input
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
              value={form.line1}
              onChange={(e) => setForm({ ...form, line1: e.target.value })}
              placeholder="123 Cuba Street"
            />
          </div>

          <div>
            <label className="text-xs text-stone-500 block mb-1">Address line 2</label>
            <input
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
              value={form.line2}
              onChange={(e) => setForm({ ...form, line2: e.target.value })}
              placeholder="Suite 4"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-500 block mb-1">City *</label>
              <input
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Wellington"
              />
            </div>
            <div>
              <label className="text-xs text-stone-500 block mb-1">Postal code *</label>
              <input
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                placeholder="6011"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-500 block mb-1">State / Region</label>
              <input
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="Wellington"
              />
            </div>
            <div>
              <label className="text-xs text-stone-500 block mb-1">Country *</label>
              <select
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                value={form.country}
                onChange={(e) => { setForm({ ...form, country: e.target.value }); setRates([]); setSelectedRateCode('') }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={fetchRates}
            disabled={loadingRates}
            className="w-full mt-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loadingRates ? 'Getting rates...' : 'Get live shipping rates'}
          </button>

          {rateError && (
            <p className="text-red-500 text-xs mt-1">{rateError}</p>
          )}
        </div>

        {/* Rates + order summary */}
        <div className="space-y-4">
          {/* Order summary */}
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <h2 className="font-medium text-stone-900 mb-3">Order summary</h2>
            <div className="space-y-1.5">
              {items.map((item) => (
                <div key={item.sku} className="flex justify-between text-sm">
                  <span className="text-stone-600">
                    {item.name}{item.variantName ? ` — ${item.variantName}` : ''} × {item.quantity}
                  </span>
                  <span className="text-stone-900">${(item.pricePerUnit * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-stone-100 mt-3 pt-3 flex justify-between text-sm">
              <span className="text-stone-500">Subtotal ({units} units)</span>
              <span className="font-medium">${sub.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-stone-400 mt-1">
              <span>Total weight</span>
              <span>{weight.toFixed(2)} kg</span>
            </div>
          </div>

          {/* DHL rates */}
          {rates.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <h2 className="font-medium text-stone-900 mb-3">Choose shipping</h2>
              <div className="space-y-2">
                {rates.map((rate) => {
                  const perUnit = units > 0 ? rate.totalPrice / units : 0
                  const isSelected = selectedRateCode === rate.productCode
                  const eta = rate.deliveryDate
                    ? new Date(rate.deliveryDate).toLocaleDateString('en-NZ', { weekday: 'short', month: 'short', day: 'numeric' })
                    : `~${rate.transitDays} days`

                  return (
                    <button
                      key={rate.productCode}
                      onClick={() => setSelectedRateCode(rate.productCode)}
                      className={`w-full text-left rounded-lg border p-3.5 transition-colors ${
                        isSelected
                          ? 'border-stone-900 bg-stone-50'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-medium text-stone-900">{rate.productName}</div>
                          <div className="text-xs text-stone-400 mt-0.5">Estimated delivery: {eta}</div>
                          <div className="text-xs text-stone-500 mt-1 bg-stone-100 inline-block px-2 py-0.5 rounded-full">
                            ${perUnit.toFixed(2)} per unit
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-sm font-semibold text-stone-900">
                            {rate.currency} ${rate.totalPrice.toFixed(2)}
                          </div>
                          {isSelected && (
                            <div className="text-xs text-stone-900 mt-0.5">Selected ✓</div>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {selectedRate && (
                <div className="mt-3 pt-3 border-t border-stone-100">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Total (incl. shipping)</span>
                    <span>{selectedRate.currency} ${(sub + selectedRate.totalPrice).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-stone-400 mt-0.5">
                    <span>Shipping cost per unit</span>
                    <span>${shippingPerUnit.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {canContinue && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="text-sm text-stone-500">
              {selectedRate?.productName} · {selectedRate?.currency} ${selectedRate?.totalPrice.toFixed(2)} shipping
            </div>
            <button
              onClick={handleContinue}
              className="bg-stone-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-stone-700 transition-colors"
            >
              Continue to payment →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
