import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get('symbol')
  const days = parseInt(searchParams.get('days') || '252')

  if (!symbol) {
    return NextResponse.json(
      { error: 'Missing symbol parameter' },
      { status: 400 }
    )
  }

  try {
    const endDate = Math.floor(Date.now() / 1000)
    const startDate = endDate - (days * 24 * 60 * 60)

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startDate}&period2=${endDate}&interval=1d`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch historical data')
    }

    const data = await response.json()
    const result = data.chart.result[0]
    const timestamps = result?.timestamp || []
    const quote = result?.indicators?.quote[0] || {}
    
    const open = quote.open || []
    const high = quote.high || []
    const low = quote.low || []
    const close = quote.close || []
    const volume = quote.volume || []

    const formattedData = timestamps.map((timestamp: number, i: number) => ({
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      open: open[i] || close[i] || 0,
      high: high[i] || close[i] || 0,
      low: low[i] || close[i] || 0,
      close: close[i] || 0,
      volume: volume[i] || 0,
    })).filter((item: any) => item.close !== null && item.close !== 0)

    return NextResponse.json({ prices: formattedData })
  } catch (error) {
    console.error('Error fetching historical data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch historical data' },
      { status: 500 }
    )
  }
}