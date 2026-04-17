'use client'
import { useEffect, useState, useCallback } from 'react'
import type { Coffee, RoastEntry, StockEvent, InventoryData } from '../api/inventory/route'

const navy = '#25295B'
const cream = '#FBF9F3'
const border = '#e5e2db'
const muted = '#6b6b7b'
const green = '#2d6a4f'
const greenBg = '#d8f3dc'
const red = '#dc2626'
const amber = '#b45309'
const amberBg = '#fef3c7'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(kg: number) {
  return kg % 1 === 0 ? `${kg} kg` : `${kg.toFixed(2)} kg`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function exportCSV(roasts: RoastEntry[]) {
  const header = 'Date,Coffee,Green (kg),Roasted (kg),Weight Loss (%),Notes'
  const rows = roasts.map((r) =>
    [fmtDate(r.date), `"${r.coffeeName}"`, r.greenKg, r.roastedKg, r.weightLossPct, `"${r.notes ?? ''}"`].join(',')
  )
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `roast-log-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  border: `1px solid ${border}`, borderRadius: 8, padding: '8px 12px',
  fontSize: 13, color: navy, background: '#fff', width: '100%',
  boxSizing: 'border-box', fontFamily: 'var(--font-body)',
}

const btnPrimary: React.CSSProperties = {
  background: navy, color: '#fff', border: 'none', borderRadius: 8,
  padding: '9px 18px', fontSize: 13, fontWeight: 400, cursor: 'pointer',
  fontFamily: 'var(--font-body)',
}

const btnSecondary: React.CSSProperties = {
  background: cream, color: navy, border: `1px solid ${border}`,
  borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 400,
  cursor: 'pointer', fontFamily: 'var(--font-body)',
}

const lbl: React.CSSProperties = {
  fontSize: 11, color: muted, display: 'block', marginBottom: 4,
  textTransform: 'uppercase', letterSpacing: '0.06em',
}

// ── Overlay ────────────────────────────────────────────────────────────────────

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(37,41,91,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 440, boxShadow: '0 8px 32px rgba(37,41,91,0.15)' }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

// ── Add Coffee Modal ───────────────────────────────────────────────────────────

function AddCoffeeModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [greenKg, setGreenKg] = useState('')
  const [reorderKg, setReorderKg] = useState('5')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !greenKg) { setError('Fill in all fields'); return }
    setSaving(true)
    const res = await fetch('/api/inventory', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_coffee', name: name.trim(), greenKg: Number(greenKg), reorderKg: Number(reorderKg) }),
    })
    if (res.ok) { onSaved(); onClose() }
    else { setError('Could not save'); setSaving(false) }
  }

  return (
    <Overlay onClose={onClose}>
      <h2 style={{ fontSize: '1rem', color: navy, margin: '0 0 16px' }}>Add Coffee</h2>
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={lbl}>Coffee name</label>
          <input style={inputStyle} placeholder="e.g. Ethiopia Guji Natural" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>Green on hand (kg)</label>
            <input style={inputStyle} type="number" min="0" step="0.01" placeholder="e.g. 27" value={greenKg} onChange={(e) => setGreenKg(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Reorder at (kg)</label>
            <input style={inputStyle} type="number" min="0" step="0.5" placeholder="e.g. 5" value={reorderKg} onChange={(e) => setReorderKg(e.target.value)} />
          </div>
        </div>
        {error && <p style={{ color: red, fontSize: 12, margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" style={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="submit" style={btnPrimary} disabled={saving}>{saving ? 'Saving…' : 'Add Coffee'}</button>
        </div>
      </form>
    </Overlay>
  )
}

// ── Add Stock Modal ────────────────────────────────────────────────────────────

function AddStockModal({ coffee, onClose, onSaved }: { coffee: Coffee; onClose: () => void; onSaved: () => void }) {
  const [addKg, setAddKg] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addKg || Number(addKg) <= 0) { setError('Enter a valid amount'); return }
    setSaving(true)
    const res = await fetch('/api/inventory', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_stock', coffeeId: coffee.id, addKg: Number(addKg) }),
    })
    if (res.ok) { onSaved(); onClose() }
    else { setError('Could not save'); setSaving(false) }
  }

  return (
    <Overlay onClose={onClose}>
      <h2 style={{ fontSize: '1rem', color: navy, margin: '0 0 4px' }}>Receive Green</h2>
      <p style={{ fontSize: 13, color: muted, margin: '0 0 16px' }}>{coffee.name}</p>
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={lbl}>Kg received (adds to current {fmt(coffee.greenKg)})</label>
          <input style={inputStyle} type="number" min="0.01" step="0.01" placeholder="e.g. 27" value={addKg} onChange={(e) => setAddKg(e.target.value)} autoFocus />
          {addKg && Number(addKg) > 0 && (
            <p style={{ fontSize: 12, color: green, marginTop: 4 }}>New total: {fmt(Math.round((coffee.greenKg + Number(addKg)) * 1000) / 1000)}</p>
          )}
        </div>
        {error && <p style={{ color: red, fontSize: 12, margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" style={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="submit" style={btnPrimary} disabled={saving}>{saving ? 'Saving…' : 'Add Stock'}</button>
        </div>
      </form>
    </Overlay>
  )
}

// ── Set Reorder Modal ──────────────────────────────────────────────────────────

function SetReorderModal({ coffee, onClose, onSaved }: { coffee: Coffee; onClose: () => void; onSaved: () => void }) {
  const [reorderKg, setReorderKg] = useState(String(coffee.reorderKg ?? 5))
  const [saving, setSaving] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/inventory', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_reorder', coffeeId: coffee.id, reorderKg: Number(reorderKg) }),
    })
    onSaved(); onClose()
  }

  return (
    <Overlay onClose={onClose}>
      <h2 style={{ fontSize: '1rem', color: navy, margin: '0 0 4px' }}>Reorder Threshold</h2>
      <p style={{ fontSize: 13, color: muted, margin: '0 0 16px' }}>{coffee.name}</p>
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={lbl}>Warn when green stock falls below (kg)</label>
          <input style={inputStyle} type="number" min="0" step="0.5" value={reorderKg} onChange={(e) => setReorderKg(e.target.value)} autoFocus />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" style={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="submit" style={btnPrimary} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Overlay>
  )
}

// ── Log Roast Modal ────────────────────────────────────────────────────────────

const BATCH_PRESETS = [5, 13.5]

function LogRoastModal({ coffees, onClose, onSaved }: { coffees: Coffee[]; onClose: () => void; onSaved: () => void }) {
  const [coffeeId, setCoffeeId] = useState(coffees[0]?.id ?? '')
  const [greenKg, setGreenKg] = useState('')
  const [weightLossPct, setWeightLossPct] = useState('12')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedCoffee = coffees.find((c) => c.id === coffeeId)
  const green_num = Number(greenKg)
  const loss_num = Number(weightLossPct)
  const roastedKg = green_num > 0 && loss_num >= 0 ? green_num * (1 - loss_num / 100) : 0
  const overStock = selectedCoffee && green_num > selectedCoffee.greenKg

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!coffeeId || !greenKg || !weightLossPct) { setError('Fill in all fields'); return }
    setSaving(true)
    const res = await fetch('/api/inventory/roast', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coffeeId, greenKg: green_num, weightLossPct: loss_num, notes }),
    })
    const data = await res.json()
    if (res.ok) { onSaved(); onClose() }
    else { setError(data.error ?? 'Could not save'); setSaving(false) }
  }

  return (
    <Overlay onClose={onClose}>
      <h2 style={{ fontSize: '1rem', color: navy, margin: '0 0 16px' }}>Log a Roast</h2>
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={lbl}>Coffee</label>
          <select style={inputStyle} value={coffeeId} onChange={(e) => setCoffeeId(e.target.value)}>
            {coffees.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {fmt(c.greenKg)} green</option>
            ))}
          </select>
        </div>

        <div>
          <label style={lbl}>Green used (kg)</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            {BATCH_PRESETS.map((p) => (
              <button
                key={p} type="button"
                onClick={() => setGreenKg(String(p))}
                style={{
                  ...btnSecondary, padding: '5px 14px', fontSize: 12,
                  background: greenKg === String(p) ? navy : cream,
                  color: greenKg === String(p) ? '#fff' : navy,
                  border: `1px solid ${greenKg === String(p) ? navy : border}`,
                }}
              >
                {p} kg
              </button>
            ))}
          </div>
          <input
            style={{ ...inputStyle, borderColor: overStock ? red : border }}
            type="number" min="0.01" step="0.01" placeholder="or enter custom"
            value={greenKg} onChange={(e) => setGreenKg(e.target.value)}
          />
          {overStock && <p style={{ color: red, fontSize: 11, marginTop: 3 }}>Exceeds stock ({fmt(selectedCoffee!.greenKg)})</p>}
        </div>

        <div>
          <label style={lbl}>Weight loss %</label>
          <input style={inputStyle} type="number" min="1" max="30" step="0.1" value={weightLossPct} onChange={(e) => setWeightLossPct(e.target.value)} />
        </div>

        {roastedKg > 0 && (
          <div style={{ background: greenBg, border: '1px solid #b7e4c7', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: green }}>Estimated roasted yield</span>
            <span style={{ fontSize: 15, color: green }}>{fmt(Math.round(roastedKg * 1000) / 1000)}</span>
          </div>
        )}

        <div>
          <label style={lbl}>Notes (optional)</label>
          <input style={inputStyle} placeholder="e.g. Batch 1, light roast" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <p style={{ color: red, fontSize: 12, margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" style={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="submit" style={{ ...btnPrimary, opacity: overStock ? 0.5 : 1 }} disabled={saving || !!overStock}>
            {saving ? 'Saving…' : 'Log Roast'}
          </button>
        </div>
      </form>
    </Overlay>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ label: l, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 10, padding: '14px 18px' }}>
      <p style={{ fontSize: 11, color: muted, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</p>
      <p style={{ fontSize: '1.3rem', color: navy, margin: 0 }}>{value}</p>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

type Tab = 'inventory' | 'roasts' | 'stock'

export default function InventoryPage() {
  const [data, setData] = useState<InventoryData | null>(null)
  const [tab, setTab] = useState<Tab>('inventory')
  const [modal, setModal] = useState<'add_coffee' | 'add_stock' | 'log_roast' | 'set_reorder' | null>(null)
  const [selectedCoffee, setSelectedCoffee] = useState<Coffee | null>(null)
  const [showAllRoasts, setShowAllRoasts] = useState(false)
  const [showAllStock, setShowAllStock] = useState(false)

  const reload = useCallback(async () => {
    const res = await fetch('/api/inventory')
    setData(await res.json())
  }, [])

  useEffect(() => { reload() }, [reload])

  const deleteRoast = async (id: string) => {
    if (!confirm('Undo this roast? Green coffee will be restored to stock.')) return
    await fetch(`/api/inventory/roast?id=${id}`, { method: 'DELETE' })
    reload()
  }

  const deleteCoffee = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from inventory?`)) return
    await fetch('/api/inventory', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_coffee', coffeeId: id }),
    })
    reload()
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 10 }}>
        <div style={{ width: 20, height: 20, border: `2px solid ${border}`, borderTopColor: navy, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const totalGreen = data.coffees.reduce((s, c) => s + c.greenKg, 0)
  const lowStock = data.coffees.filter((c) => c.greenKg <= (c.reorderKg ?? 5))
  const visibleRoasts = showAllRoasts ? data.roasts : data.roasts.slice(0, 10)
  const stockEvents: StockEvent[] = data.stockEvents ?? []
  const visibleStock = showAllStock ? stockEvents : stockEvents.slice(0, 10)

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', color: navy, margin: 0 }}>Green Inventory</h1>
          <p style={{ fontSize: 13, color: muted, margin: '4px 0 0' }}>Track green stock and roast batches</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {data.coffees.length > 0 && <button style={btnPrimary} onClick={() => setModal('log_roast')}>Log Roast</button>}
          <button style={btnSecondary} onClick={() => setModal('add_coffee')}>+ Coffee</button>
        </div>
      </div>

      {/* Low stock alert banner */}
      {lowStock.length > 0 && (
        <div style={{ background: amberBg, border: '1px solid #fcd34d', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: amber, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Low Stock</p>
          <p style={{ fontSize: 13, color: amber, margin: 0 }}>
            {lowStock.map((c) => `${c.name} (${fmt(c.greenKg)} remaining)`).join(' · ')}
          </p>
        </div>
      )}

      {/* Summary cards */}
      {data.coffees.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          <StatCard label="Total green stock" value={fmt(Math.round(totalGreen * 100) / 100)} />
          <StatCard label="Coffees tracked" value={String(data.coffees.length)} />
          <StatCard label="Roasts logged" value={String(data.roasts.length)} />
        </div>
      )}

      {/* Tabs */}
      {data.coffees.length > 0 && (
        <div style={{ display: 'flex', borderBottom: `1px solid ${border}`, marginBottom: 20 }}>
          {([['inventory', 'Stock'], ['roasts', 'Roast History'], ['stock', `Received${stockEvents.length ? ` (${stockEvents.length})` : ''}`]] as [Tab, string][]).map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? navy : 'transparent'}`,
              padding: '8px 16px', fontSize: 13, color: tab === t ? navy : muted,
              cursor: 'pointer', fontFamily: 'var(--font-body)', marginBottom: -1,
            }}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* ── Tab: Stock ── */}
      {(tab === 'inventory' || data.coffees.length === 0) && (
        <>
          {data.coffees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', background: '#fff', border: `1px solid ${border}`, borderRadius: 12 }}>
              <p style={{ color: muted, fontSize: 14, marginBottom: 16 }}>No coffees in inventory yet.</p>
              <button style={btnPrimary} onClick={() => setModal('add_coffee')}>Add your first coffee</button>
            </div>
          ) : (
            <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: `1px solid ${border}`, display: 'grid', gridTemplateColumns: '1fr 100px 110px 110px 110px', gap: 8 }}>
                {['Coffee', 'Green', 'Est. Roasted', 'Reorder At', 'Actions'].map((h) => (
                  <span key={h} style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                ))}
              </div>
              {data.coffees.map((coffee, i) => {
                const estRoasted = coffee.greenKg * 0.88
                const threshold = coffee.reorderKg ?? 5
                const isLow = coffee.greenKg <= threshold
                return (
                  <div key={coffee.id} style={{
                    padding: '13px 16px', display: 'grid',
                    gridTemplateColumns: '1fr 100px 110px 110px 110px',
                    gap: 8, alignItems: 'center',
                    borderBottom: i < data.coffees.length - 1 ? `1px solid ${border}` : 'none',
                    background: isLow ? '#fffbeb' : '#fff',
                  }}>
                    <span style={{ fontSize: 13, color: navy }}>
                      {coffee.name}
                      {isLow && <span style={{ fontSize: 10, color: amber, background: amberBg, borderRadius: 20, padding: '2px 7px', marginLeft: 7 }}>Low</span>}
                    </span>
                    <span style={{ fontSize: 13, color: navy }}>{fmt(coffee.greenKg)}</span>
                    <span style={{ fontSize: 13, color: muted }}>~{fmt(Math.round(estRoasted * 100) / 100)}</span>
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, fontSize: 13, color: muted, textDecoration: 'underline dotted', fontFamily: 'var(--font-body)' }}
                      title="Edit reorder threshold"
                      onClick={() => { setSelectedCoffee(coffee); setModal('set_reorder') }}
                    >
                      {fmt(threshold)}
                    </button>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button style={{ ...btnSecondary, padding: '5px 10px', fontSize: 12 }} onClick={() => { setSelectedCoffee(coffee); setModal('add_stock') }}>
                        + Stock
                      </button>
                      <button style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 16, padding: '2px 4px' }} onClick={() => deleteCoffee(coffee.id, coffee.name)}>×</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {data.coffees.length > 0 && (
            <p style={{ fontSize: 11, color: muted, marginTop: 8 }}>* Est. roasted at 12% weight loss · Click reorder threshold to edit</p>
          )}
        </>
      )}

      {/* ── Tab: Roast History ── */}
      {tab === 'roasts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            {data.roasts.length > 0 && (
              <button style={{ ...btnSecondary, fontSize: 12, padding: '6px 14px' }} onClick={() => exportCSV(data.roasts)}>
                Export CSV
              </button>
            )}
          </div>
          {data.roasts.length === 0 ? (
            <p style={{ color: muted, fontSize: 13, textAlign: 'center', padding: '40px 0' }}>No roasts logged yet.</p>
          ) : (
            <>
              <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', borderBottom: `1px solid ${border}`, display: 'grid', gridTemplateColumns: '120px 1fr 80px 90px 60px 28px', gap: 8 }}>
                  {['Date', 'Coffee', 'Green', 'Roasted', 'Loss', ''].map((h) => (
                    <span key={h} style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                  ))}
                </div>
                {visibleRoasts.map((roast, i) => (
                  <div key={roast.id} style={{
                    padding: '12px 16px', display: 'grid',
                    gridTemplateColumns: '120px 1fr 80px 90px 60px 28px',
                    gap: 8, alignItems: 'center',
                    borderBottom: i < visibleRoasts.length - 1 ? `1px solid ${border}` : 'none',
                  }}>
                    <span style={{ fontSize: 12, color: muted }}>{fmtDate(roast.date)}</span>
                    <div>
                      <span style={{ fontSize: 13, color: navy }}>{roast.coffeeName}</span>
                      {roast.notes && <span style={{ fontSize: 11, color: muted, display: 'block' }}>{roast.notes}</span>}
                    </div>
                    <span style={{ fontSize: 13, color: navy }}>{fmt(roast.greenKg)}</span>
                    <span style={{ fontSize: 13, color: green }}>{fmt(roast.roastedKg)}</span>
                    <span style={{ fontSize: 12, color: muted }}>{roast.weightLossPct}%</span>
                    <button style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 14, padding: 0 }} title="Undo roast" onClick={() => deleteRoast(roast.id)}>↩</button>
                  </div>
                ))}
              </div>
              {data.roasts.length > 10 && (
                <button style={{ ...btnSecondary, marginTop: 10, width: '100%', textAlign: 'center' }} onClick={() => setShowAllRoasts(!showAllRoasts)}>
                  {showAllRoasts ? 'Show less' : `Show all ${data.roasts.length} roasts`}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab: Stock Received ── */}
      {tab === 'stock' && (
        <div>
          {stockEvents.length === 0 ? (
            <p style={{ color: muted, fontSize: 13, textAlign: 'center', padding: '40px 0' }}>No stock received yet.</p>
          ) : (
            <>
              <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', borderBottom: `1px solid ${border}`, display: 'grid', gridTemplateColumns: '140px 1fr 100px 110px', gap: 8 }}>
                  {['Date', 'Coffee', 'Received', 'New Total'].map((h) => (
                    <span key={h} style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                  ))}
                </div>
                {visibleStock.map((ev, i) => (
                  <div key={ev.id} style={{
                    padding: '12px 16px', display: 'grid',
                    gridTemplateColumns: '140px 1fr 100px 110px',
                    gap: 8, alignItems: 'center',
                    borderBottom: i < visibleStock.length - 1 ? `1px solid ${border}` : 'none',
                  }}>
                    <span style={{ fontSize: 12, color: muted }}>{fmtDate(ev.date)}</span>
                    <span style={{ fontSize: 13, color: navy }}>{ev.coffeeName}</span>
                    <span style={{ fontSize: 13, color: green }}>+{fmt(ev.addKg)}</span>
                    <span style={{ fontSize: 13, color: muted }}>{fmt(ev.newTotal)}</span>
                  </div>
                ))}
              </div>
              {stockEvents.length > 10 && (
                <button style={{ ...btnSecondary, marginTop: 10, width: '100%', textAlign: 'center' }} onClick={() => setShowAllStock(!showAllStock)}>
                  {showAllStock ? 'Show less' : `Show all ${stockEvents.length} entries`}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {modal === 'add_coffee' && <AddCoffeeModal onClose={() => setModal(null)} onSaved={reload} />}
      {modal === 'add_stock' && selectedCoffee && <AddStockModal coffee={selectedCoffee} onClose={() => setModal(null)} onSaved={reload} />}
      {modal === 'set_reorder' && selectedCoffee && <SetReorderModal coffee={selectedCoffee} onClose={() => setModal(null)} onSaved={reload} />}
      {modal === 'log_roast' && data.coffees.length > 0 && <LogRoastModal coffees={data.coffees} onClose={() => setModal(null)} onSaved={reload} />}
    </div>
  )
}
