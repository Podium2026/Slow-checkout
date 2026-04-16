import { NextRequest, NextResponse } from 'next/server'
import { getOrderByNumber } from '@/lib/orderspace'

export async function GET(req: NextRequest) {
  const number = req.nextUrl.searchParams.get('number')
  if (!number) return NextResponse.json({ error: 'Order number required' }, { status: 400 })

  try {
    const order = await getOrderByNumber(number)
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    return NextResponse.json({ order })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
