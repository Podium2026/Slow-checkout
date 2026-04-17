import { NextRequest, NextResponse } from 'next/server'
import { readData, writeData } from '@/lib/storage'
import { randomUUID } from 'crypto'

export interface Coffee {
  id: string
  name: string
  greenKg: number
  reorderKg: number
  addedAt: string
}

export interface RoastEntry {
  id: string
  coffeeId: string
  coffeeName: string
  greenKg: number
  roastedKg: number
  weightLossPct: number
  date: string
  notes?: string
}

export interface StockEvent {
  id: string
  coffeeId: string
  coffeeName: string
  addKg: number
  newTotal: number
  date: string
}

export interface InventoryData {
  coffees: Coffee[]
  roasts: RoastEntry[]
  stockEvents: StockEvent[]
}

export async function GET() {
  return NextResponse.json(await readData())
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const data = await readData()

  if (body.action === 'add_coffee') {
    const coffee: Coffee = {
      id: randomUUID(),
      name: body.name,
      greenKg: Number(body.greenKg),
      reorderKg: Number(body.reorderKg ?? 5),
      addedAt: new Date().toISOString(),
    }
    data.coffees.push(coffee)
    await writeData(data)
    return NextResponse.json({ coffee })
  }

  if (body.action === 'update_stock') {
    const coffee = data.coffees.find((c) => c.id === body.coffeeId)
    if (!coffee) return NextResponse.json({ error: 'Coffee not found' }, { status: 404 })
    coffee.greenKg = Number(body.greenKg)
    await writeData(data)
    return NextResponse.json({ coffee })
  }

  if (body.action === 'add_stock') {
    const coffee = data.coffees.find((c) => c.id === body.coffeeId)
    if (!coffee) return NextResponse.json({ error: 'Coffee not found' }, { status: 404 })
    const addKg = Number(body.addKg)
    coffee.greenKg = Math.round((coffee.greenKg + addKg) * 1000) / 1000
    const event: StockEvent = {
      id: randomUUID(),
      coffeeId: coffee.id,
      coffeeName: coffee.name,
      addKg,
      newTotal: coffee.greenKg,
      date: new Date().toISOString(),
    }
    if (!data.stockEvents) data.stockEvents = []
    data.stockEvents.unshift(event)
    await writeData(data)
    return NextResponse.json({ coffee })
  }

  if (body.action === 'set_reorder') {
    const coffee = data.coffees.find((c) => c.id === body.coffeeId)
    if (!coffee) return NextResponse.json({ error: 'Coffee not found' }, { status: 404 })
    coffee.reorderKg = Number(body.reorderKg)
    await writeData(data)
    return NextResponse.json({ coffee })
  }

  if (body.action === 'delete_coffee') {
    data.coffees = data.coffees.filter((c) => c.id !== body.coffeeId)
    await writeData(data)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
