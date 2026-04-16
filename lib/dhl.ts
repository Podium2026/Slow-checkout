const DHL_BASE = process.env.DHL_SANDBOX === 'true'
  ? 'https://express.api.dhl.com/mydhlapi/test'
  : 'https://express.api.dhl.com/mydhlapi'

export interface DHLRateRequest {
  toCity: string
  toPostalCode: string
  toCountry: string
  weightKg: number
  length?: number  // cm
  width?: number
  height?: number
}

export interface DHLRate {
  productCode: string
  productName: string
  totalPrice: number
  currency: string
  deliveryDate: string
  transitDays: number
}

export async function getDHLRates(req: DHLRateRequest): Promise<DHLRate[]> {
  const apiKey = process.env.DHL_API_KEY
  const apiSecret = process.env.DHL_API_SECRET

  // Return mock rates if no DHL credentials yet
  if (!apiKey || !apiSecret) {
    return getMockRates(req)
  }

  const plannedDate = new Date()
  plannedDate.setDate(plannedDate.getDate() + 1)
  // DHL requires a business day
  if (plannedDate.getDay() === 0) plannedDate.setDate(plannedDate.getDate() + 1)
  if (plannedDate.getDay() === 6) plannedDate.setDate(plannedDate.getDate() + 2)

  const params = new URLSearchParams({
    accountNumber: process.env.DHL_ACCOUNT_NUMBER!,
    originCountryCode: process.env.DHL_SHIPPER_COUNTRY!,
    originCityName: process.env.DHL_SHIPPER_CITY!,
    originPostalCode: process.env.DHL_SHIPPER_POSTAL_CODE!,
    destinationCountryCode: req.toCountry,
    destinationCityName: req.toCity,
    destinationPostalCode: req.toPostalCode,
    weight: req.weightKg.toFixed(2),
    length: (req.length ?? 20).toString(),
    width: (req.width ?? 15).toString(),
    height: (req.height ?? 10).toString(),
    plannedShippingDateAndTime: plannedDate.toISOString().split('T')[0] + 'T09:00:00 GMT+12:00',
    isCustomsDeclarable: 'false',
    unitOfMeasurement: 'metric',
    nextBusinessDay: 'false',
  })

  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')

  const res = await fetch(`${DHL_BASE}/rates?${params}`, {
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('DHL rate error:', err)
    // Fall back to mock if API fails
    return getMockRates(req)
  }

  const data = await res.json()

  return (data.products ?? []).map((p: any) => ({
    productCode: p.productCode,
    productName: p.productName,
    totalPrice: p.totalPrice?.[0]?.price ?? 0,
    currency: p.totalPrice?.[0]?.priceCurrency ?? 'NZD',
    deliveryDate: p.deliveryCapabilities?.estimatedDeliveryDateAndTime ?? '',
    transitDays: p.deliveryCapabilities?.transitDays ?? 0,
  }))
}

// Mock rates for development / before DHL key arrives
function getMockRates(req: DHLRateRequest): DHLRate[] {
  const baseRate = req.weightKg * 8.5
  const isInternational = req.toCountry !== 'NZ'

  const deliveryDate = new Date()
  deliveryDate.setDate(deliveryDate.getDate() + (isInternational ? 3 : 2))

  if (!isInternational) {
    return [
      {
        productCode: 'D',
        productName: 'DHL Express Domestic',
        totalPrice: +(baseRate + 12).toFixed(2),
        currency: 'NZD',
        deliveryDate: deliveryDate.toISOString(),
        transitDays: 1,
      },
    ]
  }

  return [
    {
      productCode: 'P',
      productName: 'DHL Express Worldwide',
      totalPrice: +(baseRate + 35).toFixed(2),
      currency: 'NZD',
      deliveryDate: deliveryDate.toISOString(),
      transitDays: 3,
    },
    {
      productCode: 'K',
      productName: 'DHL Express 9:00',
      totalPrice: +(baseRate + 65).toFixed(2),
      currency: 'NZD',
      deliveryDate: deliveryDate.toISOString(),
      transitDays: 2,
    },
  ]
}
