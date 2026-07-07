import { NextRequest, NextResponse } from 'next/server'

interface AnalysisResponse {
  ticker: string
  currentPrice: number
  percentiles: {
    p10: number[]
    p50: number[]
    p90: number[]
  }
  probabilityOfProfit: number
  valueAtRisk: number
  expectedReturn: number
  maxDrawdown: number
  forecast: {
    bestCase: number
    worstCase: number
    mostLikely: number
  }
}

async function getHistoricalData(symbol: string, days: number = 252) {
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
    const prices = data.chart.result[0]?.indicators?.quote[0]?.close || []
    const validPrices = prices.filter((p: number | null) => p !== null)
    
    if (validPrices.length < 50) {
      return null
    }
    
    return { prices: validPrices }
  } catch (error) {
    console.error('Error fetching historical data:', error)
    return null
  }
}

function runBootstrap(
  currentPrice: number,
  historicalReturns: number[],
  days: number = 252,
  iterations: number = 5000
) {
  console.log('=== Monte Carlo Debug ===')
  console.log('Current Price:', currentPrice)
  console.log('Historical Returns Sample (first 10):', historicalReturns.slice(0, 10))
  console.log('Number of historical returns:', historicalReturns.length)
  
  // Count positive vs negative returns
  const positive = historicalReturns.filter(r => r > 0).length
  const negative = historicalReturns.filter(r => r < 0).length
  console.log('Positive returns:', positive, 'Negative returns:', negative)
  console.log('Positive ratio:', positive / historicalReturns.length)
  
  // Calculate total return over period
  const totalReturn = historicalReturns.reduce((a, b) => a + b, 0)
  console.log('Total return over period:', totalReturn * 100 + '%')
  
  const allPaths: number[][] = []
  
  for (let i = 0; i < iterations; i++) {
    const path: number[] = [currentPrice]
    let price = currentPrice
    
    for (let day = 1; day <= days; day++) {
      const randomIndex = Math.floor(Math.random() * historicalReturns.length)
      const dailyReturn = historicalReturns[randomIndex]
      price = price * (1 + dailyReturn)
      path.push(price)
    }
    
    allPaths.push(path)
  }
  
  // Probability of profit
  const finalPrices = allPaths.map(path => path[days])
  const profitable = finalPrices.filter(p => p > currentPrice).length
  const probabilityOfProfit = profitable / finalPrices.length
  console.log('Probability of profit:', probabilityOfProfit)
  
  // Sort for stats
  const sortedFinalPrices = [...finalPrices].sort((a, b) => a - b)
  
  // Value at Risk (5%)
  const varIndex = Math.floor(sortedFinalPrices.length * 0.05)
  const varPrice = sortedFinalPrices[varIndex] || currentPrice
  const valueAtRisk = ((currentPrice - varPrice) / currentPrice) * 100
  
  // Expected return (median)
  const medianPrice = sortedFinalPrices[Math.floor(sortedFinalPrices.length * 0.5)]
  const expectedReturn = ((medianPrice - currentPrice) / currentPrice) * 100
  
  console.log('Median final price:', medianPrice)
  console.log('5th percentile price:', varPrice)
  console.log('Expected return (median):', expectedReturn + '%')
  console.log('Value at Risk:', valueAtRisk + '%')
  
  // Percentiles
  const p10: number[] = []
  const p50: number[] = []
  const p90: number[] = []
  
  for (let day = 0; day <= days; day++) {
    const pricesAtDay = allPaths.map(path => path[day])
    pricesAtDay.sort((a, b) => a - b)
    p10.push(pricesAtDay[Math.floor(pricesAtDay.length * 0.1)])
    p50.push(pricesAtDay[Math.floor(pricesAtDay.length * 0.5)])
    p90.push(pricesAtDay[Math.floor(pricesAtDay.length * 0.9)])
  }
  
  // Max drawdown (median path)
  const medianPath = allPaths[Math.floor(allPaths.length * 0.5)]
  let peak = medianPath[0]
  let maxDrawdown = 0
  for (const price of medianPath) {
    if (price > peak) peak = price
    const drawdown = ((peak - price) / peak) * 100
    if (drawdown > maxDrawdown) maxDrawdown = drawdown
  }
  
  // Sample paths for visualization
  const sampledPaths = allPaths.filter((_, i) => i % Math.floor(iterations / 50) === 0)
  
  return {
    percentiles: { p10, p50, p90 },
    probabilityOfProfit,
    valueAtRisk,
    expectedReturn,
    maxDrawdown,
    sampledPaths,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ticker, days = 252, iterations = 5000 } = body
    
    if (!ticker) {
      return NextResponse.json(
        { error: 'Missing ticker parameter' },
        { status: 400 }
      )
    }
    
    // Get 2 years of historical data
    const historicalData = await getHistoricalData(ticker, 504)
    if (!historicalData) {
      return NextResponse.json(
        { error: `Insufficient historical data for ${ticker}` },
        { status: 404 }
      )
    }
    
    const { prices } = historicalData
    const currentPrice = prices[prices.length - 1]
    
    // Calculate historical returns
    const historicalReturns = []
    for (let i = 1; i < prices.length; i++) {
      historicalReturns.push((prices[i] - prices[i-1]) / prices[i-1])
    }
    
    // Run bootstrap
    const results = runBootstrap(
      currentPrice,
      historicalReturns,
      days,
      iterations
    )
    
    const response: AnalysisResponse = {
      ticker: ticker.toUpperCase(),
      currentPrice,
      percentiles: results.percentiles,
      probabilityOfProfit: results.probabilityOfProfit,
      valueAtRisk: results.valueAtRisk,
      expectedReturn: results.expectedReturn,
      maxDrawdown: results.maxDrawdown,
      forecast: {
        bestCase: results.percentiles.p90[results.percentiles.p90.length - 1],
        worstCase: results.percentiles.p10[results.percentiles.p10.length - 1],
        mostLikely: results.percentiles.p50[results.percentiles.p50.length - 1],
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to run analysis' },
      { status: 500 }
    )
  }
}