'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/cart-store'
import { Steps } from '@/components/steps'

interface Variant {
  id: string
  sku: string
  options: Record<string, string>
  unit_price: number
  weight: number
}

interface Product {
  id: string
  name: string
  description?: string
  images: string[]
  product_variants: Variant[]
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// Infer weight from variant size name since Orderspace weight = 0
function inferWeightKg(options: Record<string, string>): number {
  const size = Object.values(options).join(' ').toLowerCase()
  if (size.includes('1kg') || size.includes('1000g')) return 1.1
  if (size.includes('500g')) return 0.55
  if (size.includes('250g')) return 0.3
  if (size.includes('200g')) return 0.25
  return 0.3
}

export default function OrderPage() {
  const router = useRouter()
  const { items, addItem, updateQuantity, removeItem, totalUnits, subtotal } = useCartStore()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products ?? [])
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load products. Please try again.')
        setLoading(false)
      })
  }, [])

  const getQty = (sku: string) => items.find((i) => i.sku === sku)?.quantity ?? 0

  const handleQty = (product: Product, variant: Variant, delta: number) => {
    const current = getQty(variant.sku)
    const next = current + delta
    if (next <= 0) {
      removeItem(variant.sku)
    } else if (current === 0) {
      addItem({
        sku: variant.sku,
        name: product.name,
        variantName: Object.values(variant.options).join(' / '),
        pricePerUnit: variant.unit_price,
        weightKg: inferWeightKg(variant.options),
        quantity: 1,
        imageUrl: product.images?.[0],
      })
    } else {
      updateQuantity(variant.sku, next)
    }
  }

  const units = totalUnits()
  const sub = subtotal()

  return (
    <div>
      <Steps current={0} />
      <h1 className="text-2xl font-semibold mb-1">Build your order</h1>
      <p className="text-stone-500 text-sm mb-6">
        Select products and quantities. Live shipping rates calculated at next step.
      </p>

      {loading && (
        <div className="text-stone-400 text-sm py-12 text-center">Loading products...</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-xl border border-stone-200 p-5">
              <div className="flex gap-4">
                {product.images?.[0] && (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-stone-900">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-stone-400 mt-0.5 line-clamp-2">
                      {stripHtml(product.description)}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {(product.product_variants ?? []).map((variant) => {
                  const qty = getQty(variant.sku)
                  const variantLabel = Object.values(variant.options).join(' / ')
                  return (
                    <div
                      key={variant.sku}
                      className="flex items-center justify-between py-2 border-t border-stone-100"
                    >
                      <div>
                        <span className="text-sm text-stone-700">{variantLabel || variant.sku}</span>
                        <span className="text-sm text-stone-400 ml-2">
                          ${variant.unit_price?.toFixed(2)} / unit
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {qty > 0 && (
                          <>
                            <button
                              onClick={() => handleQty(product, variant, -1)}
                              className="w-7 h-7 rounded-full border border-stone-300 text-stone-600 hover:bg-stone-100 flex items-center justify-center text-sm"
                            >
                              −
                            </button>
                            <span className="w-6 text-center text-sm font-medium">{qty}</span>
                          </>
                        )}
                        <button
                          onClick={() => handleQty(product, variant, 1)}
                          className="w-7 h-7 rounded-full bg-stone-900 text-white hover:bg-stone-700 flex items-center justify-center text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {units > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <span className="font-medium">{units} unit{units !== 1 ? 's' : ''}</span>
              <span className="text-stone-400 mx-2">·</span>
              <span className="text-stone-600">${sub.toFixed(2)} subtotal</span>
            </div>
            <button
              onClick={() => router.push('/shipping')}
              className="bg-stone-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-stone-700 transition-colors"
            >
              Continue to shipping →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
