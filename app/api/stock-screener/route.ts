import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '50')
  const riskLevel = searchParams.get('risk') || 'moderate'
  const exclude = searchParams.get('exclude') || ''

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const dbRes = await fetch(`${baseUrl}/api/stocks?limit=${limit}`, { cache: 'no-store' })
    const dbData = await dbRes.json()

    if (!dbData.stocks || dbData.stocks.length === 0) {
      return NextResponse.json(
        { error: 'No stocks found' },
        { status: 404 }
      )
    }

    let stocks = dbData.stocks

    if (exclude) {
      const excludeList = exclude.split(',').map((t: string) => t.trim().toUpperCase())
      stocks = stocks.filter((s: any) => !excludeList.includes(s.ticker))
    }

    // Filter out very low quality stocks
    stocks = stocks.filter((s: any) => s.expectedReturn > -5)

    // 🔥 DIFFERENT FILTERING FOR EACH RISK LEVEL
    let selectedStocks = []
    const allStocks = [...stocks]

    if (riskLevel === 'conservative') {
      // Conservative: Positive returns, low volatility
      const filtered = allStocks.filter((s: any) => s.expectedReturn > 2 && s.volatility < 30)
      // Sort by Sharpe ratio (best first)
      filtered.sort((a: any, b: any) => b.sharpeRatio - a.sharpeRatio)
      selectedStocks = filtered.slice(0, 10)
      
      // If not enough stocks, expand criteria
      if (selectedStocks.length < 4) {
        const expanded = allStocks.filter((s: any) => s.expectedReturn > 0 && s.volatility < 35)
        expanded.sort((a: any, b: any) => b.sharpeRatio - a.sharpeRatio)
        selectedStocks = expanded.slice(0, 10)
      }
    } 
    else if (riskLevel === 'aggressive') {
      // Aggressive: High growth potential (higher expected return)
      const filtered = allStocks.filter((s: any) => s.expectedReturn > 8)
      // Sort by expected return (highest first)
      filtered.sort((a: any, b: any) => b.expectedReturn - a.expectedReturn)
      selectedStocks = filtered.slice(0, 10)
      
      // If not enough stocks, expand criteria
      if (selectedStocks.length < 4) {
        const expanded = allStocks.filter((s: any) => s.expectedReturn > 5)
        expanded.sort((a: any, b: any) => b.expectedReturn - a.expectedReturn)
        selectedStocks = expanded.slice(0, 10)
      }
    } 
    else {
      // Moderate: Balanced approach
      const filtered = allStocks.filter((s: any) => s.expectedReturn > 2 && s.volatility > 10 && s.volatility < 45)
      // Sort by Sharpe ratio (best first)
      filtered.sort((a: any, b: any) => b.sharpeRatio - a.sharpeRatio)
      selectedStocks = filtered.slice(0, 10)
      
      // If not enough stocks, expand criteria
      if (selectedStocks.length < 4) {
        const expanded = allStocks.filter((s: any) => s.expectedReturn > 1)
        expanded.sort((a: any, b: any) => b.sharpeRatio - a.sharpeRatio)
        selectedStocks = expanded.slice(0, 10)
      }
    }

    // Ensure we have at least 3 stocks
    if (selectedStocks.length < 3) {
      const fallback = allStocks.sort((a: any, b: any) => b.sharpeRatio - a.sharpeRatio).slice(0, 8)
      selectedStocks = fallback
    }

    // 🔥 DIVERSIFY: Enforce sector diversification
    const sectors: Record<string, number> = {}
    const finalStocks = []
    const maxSectorAllocation = riskLevel === 'conservative' ? 0.40 : riskLevel === 'aggressive' ? 0.50 : 0.45

    // Shuffle the selected stocks to get variety
    const shuffled = [...selectedStocks]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    for (const stock of shuffled) {
      if (finalStocks.length >= 6) break
        
      const sector = stock.sector || 'Other'
      const currentSectorCount = sectors[sector] || 0
      const totalSelected = finalStocks.length
      
      // Allow more sector concentration for aggressive
      const allowed = riskLevel === 'aggressive' ? 0.60 : 0.40
      if (currentSectorCount / Math.max(totalSelected, 1) < allowed || totalSelected < 2) {
        finalStocks.push(stock)
        sectors[sector] = (sectors[sector] || 0) + 1
      }
    }

    // If we still don't have enough, add more
    if (finalStocks.length < 3) {
      for (const stock of shuffled) {
        if (!finalStocks.includes(stock) && finalStocks.length < 6) {
          finalStocks.push(stock)
        }
      }
    }

    // 🔥 Score for allocation weighting
    const scoredStocks = finalStocks.map((s: any) => {
      let score = 0
      if (riskLevel === 'conservative') {
        score = (s.expectedReturn * 0.4) - (s.volatility * 0.4) + (s.sharpeRatio * 0.2)
      } else if (riskLevel === 'aggressive') {
        score = (s.expectedReturn * 0.6) - (s.volatility * 0.2) + (s.sharpeRatio * 0.2)
      } else {
        score = (s.expectedReturn * 0.5) - (s.volatility * 0.3) + (s.sharpeRatio * 0.2)
      }
      return { ...s, score }
    })

    // Sort by score for final ordering
    scoredStocks.sort((a: any, b: any) => b.score - a.score)

    return NextResponse.json({
      stocks: scoredStocks,
      total: stocks.length,
      sectors: sectors,
      riskLevel: riskLevel,
    })

  } catch (error) {
    console.error('Stock screener error:', error)
    return NextResponse.json(
      { error: 'Failed to screen stocks' },
      { status: 500 }
    )
  }
}