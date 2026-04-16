import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const DATA_FILE = path.join(process.cwd(), 'data', 'inventory.json')

export interface Coffee {
  id: string
  name: string
  greenKg: number
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

export interface InventoryData {
  coffees: Coffee[]
  roasts: RoastEntry[]
}

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

export async function GET() {
  return NextResponse.json(readData())
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const data = readData()

  if (body.action === 'add_coffee') {
    const coffee: Coffee = {
      id: randomUUID(),
      name: body.name,
      greenKg: Number(body.greenKg),
      addedAt: new Date().toISOString(),
    }
    data.coffees.push(coffee)
    writeData(data)
    return NextResponse.json({ coffee })
  }

  if (body.action === 'update_stock') {
    const coffee = data.coffees.find((c) => c.id === body.coffeeId)
    if (!coffee) return NextResponse.json({ error: 'Coffee not found' }, { status: 404 })
    coffee.greenKg = Number(body.greenKg)
    writeData(data)
    return NextResponse.json({ coffee })
  }

  if (body.action === 'add_stock') {
    const coffee = data.coffees.find((c) => c.id === body.coffeeId)
    if (!coffee) return NextResponse.json({ error: 'Coffee not found' }, { status: 404 })
    coffee.greenKg += Number(body.addKg)
    writeData(data)
    return NextResponse.json({ coffee })
  }

  if (body.action === 'delete_coffee') {
    data.coffees = data.coffees.filter((c) => c.id !== body.coffeeId)
    writeData(data)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
