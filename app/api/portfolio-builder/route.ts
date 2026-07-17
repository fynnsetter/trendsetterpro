import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, timeframe, riskTolerance } = body

    if (!amount || !timeframe || !riskTolerance) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 🔥 THE FIX: Use environment variable or fallback to localhost
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    // Get top stocks from screener
    const screenerRes = await fetch(
      `${baseUrl}/api/stock-screener?limit=30&risk=${riskTolerance}`,
      { cache: 'no-store' }
    )
    const screenerData = await screenerRes.json()

    if (!screenerData.stocks || screenerData.stocks.length === 0) {
      return NextResponse.json(
        { error: 'No stocks found. Please try again.' },
        { status: 404 }
      )
    }

    const topStocks = screenerData.stocks.slice(0, 5)

    // Calculate allocations based on scores
    const totalScore = topStocks.reduce((sum: number, s: any) => sum + s.score, 0)
    const suggestions = topStocks.map((stock: any) => ({
      ticker: stock.ticker,
      allocation: Math.max((stock.score / totalScore) * 100, 5),
      expectedReturn: Math.min(Math.max(stock.expectedReturn, -20), 50),
      volatility: Math.min(stock.volatility, 80),
      reason: generateReason(stock, riskTolerance),
      sector: stock.sector || 'Unknown',
      assetClass: stock.assetClass || 'equity',
    }))

    // Normalize allocations to sum to 100%
    const totalAllocation = suggestions.reduce((sum: number, s: any) => sum + s.allocation, 0)
    const normalizedSuggestions = suggestions.map((s: any) => ({
      ...s,
      allocation: (s.allocation / totalAllocation) * 100,
    }))

    // Calculate portfolio metrics
    const annualReturn = normalizedSuggestions.reduce(
      (sum: number, s: any) => sum + (s.expectedReturn * s.allocation / 100), 0
    )
    const annualRisk = normalizedSuggestions.reduce(
      (sum: number, s: any) => sum + (s.volatility * s.allocation / 100), 0
    )

    const timeframeMonths = parseInt(timeframe) || 3
    const years = timeframeMonths / 12
    
    const adjustedReturn = annualReturn * years
    const adjustedRisk = annualRisk * Math.sqrt(years)

    const mcResults = runMonteCarlo(amount, adjustedReturn, adjustedRisk, 1000)
    
    const projectedValue = mcResults.median
    const projectedMin = mcResults.p10
    const projectedMax = mcResults.p90
    const probabilityOfProfit = mcResults.probabilityOfProfit

    const insight = generateInsight(
      riskTolerance,
      adjustedReturn,
      adjustedRisk,
      amount,
      projectedValue,
      timeframeMonths,
      probabilityOfProfit,
      normalizedSuggestions
    )

    return NextResponse.json({
      suggestions: normalizedSuggestions,
      portfolioReturn: adjustedReturn,
      portfolioRisk: adjustedRisk,
      annualReturn: annualReturn,
      annualRisk: annualRisk,
      projectedValue,
      projectedMin,
      projectedMax,
      probabilityOfProfit,
      insight,
      timeframe,
      amount,
      riskTolerance,
      monteCarlo: {
        iterations: 1000,
        probabilityOfProfit,
        median: projectedValue,
        p10: projectedMin,
        p90: projectedMax,
      },
    })

  } catch (error) {
    console.error('Portfolio builder error:', error)
    return NextResponse.json(
      { error: 'Failed to build portfolio' },
      { status: 500 }
    )
  }
}

function runMonteCarlo(initialAmount: number, expectedReturn: number, risk: number, iterations: number) {
  const results = []
  for (let i = 0; i < iterations; i++) {
    const random = Math.random()
    const z = Math.sqrt(-2 * Math.log(random)) * Math.cos(2 * Math.PI * Math.random())
    const returnPct = expectedReturn + risk * z
    const finalValue = initialAmount * (1 + returnPct / 100)
    results.push(finalValue)
  }
  
  results.sort((a, b) => a - b)
  
  return {
    p10: results[Math.floor(results.length * 0.1)],
    median: results[Math.floor(results.length * 0.5)],
    p90: results[Math.floor(results.length * 0.9)],
    probabilityOfProfit: results.filter(r => r > initialAmount).length / results.length,
  }
}

function generateReason(stock: any, riskTolerance: string): string {
  const riskLevels: Record<string, string> = {
    conservative: 'Low volatility, steady growth',
    moderate: 'Balanced risk-reward',
    aggressive: 'High growth potential',
  }
  return `${riskLevels[riskTolerance] || 'Balanced'} - ${stock.sector} sector`
}

function generateInsight(
  riskTolerance: string,
  returnPct: number,
  riskPct: number,
  initialAmount: number,
  projectedValue: number,
  months: number,
  probabilityOfProfit: number,
  suggestions: any[]
): string {
  const profit = projectedValue - initialAmount
  const profitPct = (profit / initialAmount) * 100

  let tone = ''
  if (profitPct > 15) tone = 'aggressive growth'
  else if (profitPct > 5) tone = 'steady growth'
  else tone = 'conservative growth'

  let riskLabel = 'low'
  if (riskPct > 20) riskLabel = 'high'
  else if (riskPct > 10) riskLabel = 'moderate'

  const topSectors = suggestions.slice(0, 3).map((s: any) => s.sector).filter((s: string, i: number, arr: string[]) => arr.indexOf(s) === i).join(', ')

  return `Based on a ${riskTolerance} strategy over ${months} months with £${initialAmount}, this portfolio aims for ${tone} of approximately ${profitPct.toFixed(1)}%. The projected value is £${projectedValue.toFixed(2)} with a ${(probabilityOfProfit * 100).toFixed(0)}% probability of profit. The portfolio has ${riskLabel} risk exposure with diversification across ${topSectors}.`
}