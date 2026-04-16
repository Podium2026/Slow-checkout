import { NextRequest, NextResponse } from 'next/server'
import { getDHLRates } from '@/lib/dhl'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { toCity, toPostalCode, toCountry, weightKg } = body

    if (!toCity || !toPostalCode || !toCountry || !weightKg) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const rates = await getDHLRates({ toCity, toPostalCode, toCountry, weightKg })
    return NextResponse.json({ rates })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
