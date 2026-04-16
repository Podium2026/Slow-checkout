'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  sku: string
  name: string
  variantName?: string
  pricePerUnit: number
  weightKg: number
  quantity: number
  imageUrl?: string
}

export interface ShippingAddress {
  companyName: string
  contactName: string
  email: string
  phone: string
  line1: string
  line2: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface SelectedRate {
  productCode: string
  productName: string
  totalPrice: number
  currency: string
  deliveryDate: string
  transitDays: number
}

interface CartState {
  items: CartItem[]
  address: ShippingAddress | null
  selectedRate: SelectedRate | null
  stripePaymentIntentId: string | null

  addItem: (item: CartItem) => void
  updateQuantity: (sku: string, quantity: number) => void
  removeItem: (sku: string) => void
  clearCart: () => void
  setAddress: (address: ShippingAddress) => void
  setSelectedRate: (rate: SelectedRate) => void
  setStripePaymentIntentId: (id: string) => void

  totalUnits: () => number
  totalWeight: () => number
  subtotal: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      address: null,
      selectedRate: null,
      stripePaymentIntentId: null,

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find((i) => i.sku === item.sku)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.sku === item.sku
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            }
          }
          return { items: [...state.items, item] }
        })
      },

      updateQuantity: (sku, quantity) => {
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.sku !== sku)
              : state.items.map((i) => (i.sku === sku ? { ...i, quantity } : i)),
        }))
      },

      removeItem: (sku) => {
        set((state) => ({ items: state.items.filter((i) => i.sku !== sku) }))
      },

      clearCart: () => set({ items: [], address: null, selectedRate: null, stripePaymentIntentId: null }),

      setAddress: (address) => set({ address }),
      setSelectedRate: (rate) => set({ selectedRate: rate }),
      setStripePaymentIntentId: (id) => set({ stripePaymentIntentId: id }),

      totalUnits: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalWeight: () =>
        get().items.reduce((sum, i) => sum + i.weightKg * i.quantity, 0),
      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.pricePerUnit * i.quantity, 0),
    }),
    { name: 'slow-checkout-cart' }
  )
)
