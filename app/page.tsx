'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [number, setNumber] = useState('')

  const go = (e: React.FormEvent) => {
    e.preventDefault()
    if (number.trim()) router.push(`/pay/${number.trim()}`)
  }

  return (
    <div className="max-w-sm mx-auto py-20 text-center">
      <h1 className="text-xl font-semibold mb-2">Complete your order</h1>
      <p className="text-stone-400 text-sm mb-6">Enter your order number to pay with live shipping rates.</p>
      <form onSubmit={go} className="flex gap-2">
        <input
          className="flex-1 border border-stone-200 rounded-lg px-3 py-2.5 text-sm"
          placeholder="e.g. 1234"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
        />
        <button
          type="submit"
          className="bg-stone-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-700"
        >
          Go
        </button>
      </form>
    </div>
  )
}
