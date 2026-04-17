import type { InventoryData } from '@/app/api/inventory/route'

const EMPTY: InventoryData = { coffees: [], roasts: [], stockEvents: [] }

// ── Upstash Redis (production) ─────────────────────────────────────────────────

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

async function upstashGet(): Promise<InventoryData> {
  const res = await fetch(`${UPSTASH_URL}/get/inventory`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    cache: 'no-store',
  })
  const json = await res.json()
  if (!json.result) return { ...EMPTY }
  const data = JSON.parse(json.result) as InventoryData
  if (!data.stockEvents) data.stockEvents = []
  return data
}

async function upstashSet(data: InventoryData): Promise<void> {
  await fetch(`${UPSTASH_URL}/set/inventory`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(JSON.stringify(data)),
  })
}

// ── Local file (development) ───────────────────────────────────────────────────

import fs from 'fs'
import path from 'path'

const DATA_FILE = path.join(process.cwd(), 'data', 'inventory.json')

function fileGet(): InventoryData {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as InventoryData
    if (!data.stockEvents) data.stockEvents = []
    return data
  } catch {
    return { ...EMPTY }
  }
}

function fileSet(data: InventoryData): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function readData(): Promise<InventoryData> {
  return UPSTASH_URL && UPSTASH_TOKEN ? upstashGet() : fileGet()
}

export async function writeData(data: InventoryData): Promise<void> {
  return UPSTASH_URL && UPSTASH_TOKEN ? upstashSet(data) : fileSet(data)
}
