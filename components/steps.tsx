'use client'

const STEPS = [
  { href: '/order', label: 'Order' },
  { href: '/shipping', label: 'Shipping' },
  { href: '/payment', label: 'Payment' },
  { href: '/success', label: 'Confirm' },
]

export function Steps({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => (
        <div key={step.href} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                i < current
                  ? 'bg-stone-800 text-white'
                  : i === current
                  ? 'bg-stone-900 text-white ring-2 ring-stone-300'
                  : 'bg-stone-200 text-stone-400'
              }`}
            >
              {i < current ? '✓' : i + 1}
            </div>
            <span
              className={`text-sm ${
                i === current ? 'font-medium text-stone-900' : 'text-stone-400'
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="w-8 h-px bg-stone-200 mx-2" />
          )}
        </div>
      ))}
    </div>
  )
}
