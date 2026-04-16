import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import type { InventoryData, RoastEntry } from '../route'

const DATA_FILE = path.join(process.cwd(), 'data', 'inventory.json')

function readData(): InventoryData {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  } catch {
    return { coffees: [], roasts: [] }
  }
}

function writeData(data: InventoryData) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const data = readData()

  const coffee = data.coffees.find((c) => c.id === body.coffeeId)
  if (!coffee) return NextResponse.json({ error: 'Coffee not found' }, { status: 404 })

  const greenKg = Number(body.greenKg)
  const weightLossPct = Number(body.weightLossPct ?? 12)
  const roastedKg = greenKg * (1 - weightLossPct / 100)

  if (coffee.greenKg < greenKg) {
    return NextResponse.json({ error: `Insufficient stock. Only ${coffee.greenKg.toFixed(2)} kg available.` }, { status: 400 })
  }

  coffee.greenKg = Math.round((coffee.greenKg - greenKg) * 1000) / 1000

  const entry: RoastEntry = {
    id: randomUUID(),
    coffeeId: coffee.id,
    coffeeName: coffee.name,
    greenKg,
    roastedKg: Math.round(roastedKg * 1000) / 1000,
    weightLossPct,
    date: body.date ?? new Date().toISOString(),
    notes: body.notes ?? '',
  }

  data.roasts.unshift(entry)
  writeData(data)

  return NextResponse.json({ entry, updatedCoffee: coffee })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const data = readData()
  const entry = data.roasts.find((r) => r.id === id)
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Restore green stock
  const coffee = data.coffees.find((c) => c.id === entry.coffeeId)
  if (coffee) coffee.greenKg = Math.round((coffee.greenKg + entry.greenKg) * 1000) / 1000

  data.roasts = data.roasts.filter((r) => r.id !== id)
  writeData(data)
  return NextResponse.json({ ok: true })
}
