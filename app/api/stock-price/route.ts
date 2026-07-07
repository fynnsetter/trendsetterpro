import { NextRequest, NextResponse } from 'next/server'

// 🔥 P/E DATABASE
const PE_DATABASE: Record<string, number> = {
  'AAPL': 34.2, 'MSFT': 38.1, 'GOOGL': 27.8, 'NVDA': 69.7, 'META': 25.3,
  'AMZN': 45.6, 'TSLA': 59.8, 'NFLX': 40.2, 'AMD': 39.8, 'INTC': 19.7,
  'JPM': 12.3, 'V': 29.8, 'MA': 34.7, 'BAC': 9.8, 'GS': 11.9,
  'LLY': 119.8, 'JNJ': 24.7, 'UNH': 19.8, 'MRK': 14.8, 'PFE': 9.7,
  'KO': 24.8, 'PEP': 27.5, 'MCD': 28.1, 'NKE': 29.8, 'DIS': 34.6,
  'SPY': 21.8, 'QQQ': 27.8, 'VTI': 19.8,
}

async function getStockData(symbol: string) {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y`,
      { next: { revalidate: 3600 } }
    )

    if (!response.ok) {
      console.error(`Yahoo returned ${response.status} for ${symbol}`)
      return null
    }

    const data = await response.json()
    const result = data.chart.result[0]
    if (!result) return null

    const quote = result?.indicators?.quote[0] || {}
    const prices = quote.close || []
    const volumes = quote.volume || []
    const highs = quote.high || []
    const lows = quote.low || []

    const validPrices = prices.filter((p: number | null) => p !== null)
    if (validPrices.length === 0) return null

    const currentPrice = validPrices[validPrices.length - 1] || 0
    const currentVolume = volumes[volumes.length - 1] || 0

    const recentPrices = validPrices.slice(-30)
    const high = Math.max(...recentPrices) || currentPrice
    const low = Math.min(...recentPrices) || currentPrice

    const prevPrice = validPrices[validPrices.length - 2] || currentPrice
    const change = currentPrice - prevPrice
    const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0

    // 🔥 Get P/E from database
    const pe = PE_DATABASE[symbol] || 0

    // 🔥 DEBUG: Log the result
    console.log(`📊 ${symbol}: price=${currentPrice}, pe=${pe}`)

    return {
      price: currentPrice,
      change,
      changePercent,
      dayHigh: high,
      dayLow: low,
      volume: currentVolume,
      pe: pe,
      currency: 'GBP',
    }
  } catch (error) {
    console.error(`Error fetching stock data for ${symbol}:`, error)
    return null
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get('symbol')
  
  if (!symbol) {
    return NextResponse.json(
      { error: 'Missing symbol parameter' },
      { status: 400 }
    )
  }
  
  const data = await getStockData(symbol)
  
  if (!data) {
    return NextResponse.json(
      { error: 'Failed to fetch stock data' },
      { status: 500 }
    )
  }
  
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const symbols = body.symbols || []
    
    if (!symbols || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Missing symbols array' },
        { status: 400 }
      )
    }
    
    const prices: Record<string, number> = {}
    
    await Promise.all(
      symbols.map(async (symbol: string) => {
        const data = await getStockData(symbol)
        if (data) {
          prices[symbol] = data.price
        }
      })
    )
    
    return NextResponse.json({ prices })
  } catch (error) {
    console.error('Batch price fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    )
  }
}