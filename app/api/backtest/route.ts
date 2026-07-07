import { NextRequest, NextResponse } from 'next/server'

interface BacktestResult {
  ticker: string
  strategy: string
  initialCapital: number
  finalCapital: number
  totalReturn: number
  annualizedReturn: number
  maxDrawdown: number
  sharpeRatio: number
  winRate: number
  totalTrades: number
  trades: {
    date: string
    type: 'BUY' | 'SELL'
    price: number
    shares: number
    pnl: number
  }[]
}

async function fetchHistoricalData(symbol: string, days: number = 504) {
  const endDate = Math.floor(Date.now() / 1000)
  const startDate = endDate - (days * 24 * 60 * 60)
  
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startDate}&period2=${endDate}&interval=1d`
  )
  
  if (!response.ok) return null
  
  const data = await response.json()
  const result = data.chart.result[0]
  if (!result) return null
  
  const quote = result?.indicators?.quote[0] || {}
  const prices = quote.close || []
  const timestamps = result?.timestamp || []
  
  const validData = timestamps.map((ts: number, i: number) => ({
    date: new Date(ts * 1000).toISOString().split('T')[0],
    close: prices[i] || 0,
  })).filter((d: any) => d.close > 0)
  
  return validData
}

// Strategy 1: Moving Average Crossover (20/50)
function runMovingAverageCrossover(data: any[], initialCapital: number = 10000) {
  const prices = data.map(d => d.close)
  const dates = data.map(d => d.date)
  const shortMA = 20
  const longMA = 50
  
  const maShort: (number | null)[] = []
  const maLong: (number | null)[] = []
  
  for (let i = 0; i < prices.length; i++) {
    if (i >= shortMA - 1) {
      const sum = prices.slice(i - shortMA + 1, i + 1).reduce((a, b) => a + b, 0)
      maShort.push(sum / shortMA)
    } else {
      maShort.push(null)
    }
    
    if (i >= longMA - 1) {
      const sum = prices.slice(i - longMA + 1, i + 1).reduce((a, b) => a + b, 0)
      maLong.push(sum / longMA)
    } else {
      maLong.push(null)
    }
  }
  
  let capital = initialCapital
  let position = 0
  let entryPrice = 0
  let inPosition = false
  const trades: any[] = []
  
  for (let i = 1; i < prices.length; i++) {
    const currentPrice = prices[i]
    const short = maShort[i]
    const long = maLong[i]
    const prevShort = maShort[i - 1]
    const prevLong = maLong[i - 1]
    
    if (!short || !long || !prevShort || !prevLong) continue
    
    if (!inPosition && prevShort <= prevLong && short > long) {
      const shares = Math.floor(capital / currentPrice)
      if (shares > 0) {
        position = shares
        entryPrice = currentPrice
        capital -= shares * currentPrice
        inPosition = true
        trades.push({
          date: dates[i],
          type: 'BUY',
          price: currentPrice,
          shares: shares,
          pnl: 0,
        })
      }
    }
    else if (inPosition && prevShort >= prevLong && short < long) {
      const pnl = (currentPrice - entryPrice) * position
      capital += position * currentPrice
      trades.push({
        date: dates[i],
        type: 'SELL',
        price: currentPrice,
        shares: position,
        pnl: pnl,
      })
      position = 0
      entryPrice = 0
      inPosition = false
    }
  }
  
  if (inPosition) {
    const lastPrice = prices[prices.length - 1]
    const pnl = (lastPrice - entryPrice) * position
    capital += position * lastPrice
    trades.push({
      date: dates[dates.length - 1],
      type: 'SELL',
      price: lastPrice,
      shares: position,
      pnl: pnl,
    })
  }
  
  return calculateMetrics(trades, initialCapital, capital)
}

// Strategy 2: RSI Mean Reversion
function runRSIMeanReversion(data: any[], initialCapital: number = 10000) {
  const prices = data.map(d => d.close)
  const dates = data.map(d => d.date)
  const period = 14
  const oversold = 30
  const overbought = 70
  
  const rsiValues: (number | null)[] = []
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      rsiValues.push(null)
      continue
    }
    
    let gains = 0
    let losses = 0
    for (let j = i - period + 1; j <= i; j++) {
      const change = prices[j] - prices[j-1]
      if (change >= 0) {
        gains += change
      } else {
        losses -= change
      }
    }
    const avgGain = gains / period
    const avgLoss = losses / period
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    rsiValues.push(100 - (100 / (1 + rs)))
  }
  
  let capital = initialCapital
  let position = 0
  let entryPrice = 0
  let inPosition = false
  const trades: any[] = []
  
  for (let i = period + 1; i < prices.length; i++) {
    const currentPrice = prices[i]
    const rsi = rsiValues[i]
    const prevRsi = rsiValues[i - 1]
    
    if (rsi === null || prevRsi === null) continue
    
    // Buy when RSI crosses above oversold (mean reversion)
    if (!inPosition && prevRsi <= oversold && rsi > oversold) {
      const shares = Math.floor(capital / currentPrice)
      if (shares > 0) {
        position = shares
        entryPrice = currentPrice
        capital -= shares * currentPrice
        inPosition = true
        trades.push({
          date: dates[i],
          type: 'BUY',
          price: currentPrice,
          shares: shares,
          pnl: 0,
        })
      }
    }
    // Sell when RSI crosses below overbought or take profit at 15%
    else if (inPosition) {
      const profitPct = (currentPrice - entryPrice) / entryPrice
      if (prevRsi >= overbought && rsi < overbought || profitPct > 0.15) {
        const pnl = (currentPrice - entryPrice) * position
        capital += position * currentPrice
        trades.push({
          date: dates[i],
          type: 'SELL',
          price: currentPrice,
          shares: position,
          pnl: pnl,
        })
        position = 0
        entryPrice = 0
        inPosition = false
      }
    }
  }
  
  if (inPosition) {
    const lastPrice = prices[prices.length - 1]
    const pnl = (lastPrice - entryPrice) * position
    capital += position * lastPrice
    trades.push({
      date: dates[dates.length - 1],
      type: 'SELL',
      price: lastPrice,
      shares: position,
      pnl: pnl,
    })
  }
  
  return calculateMetrics(trades, initialCapital, capital)
}

// Strategy 3: Breakout (new high)
function runBreakout(data: any[], initialCapital: number = 10000) {
  const prices = data.map(d => d.close)
  const dates = data.map(d => d.date)
  const lookback = 20
  
  let capital = initialCapital
  let position = 0
  let entryPrice = 0
  let inPosition = false
  const trades: any[] = []
  
  for (let i = lookback; i < prices.length; i++) {
    const currentPrice = prices[i]
    const prevHigh = Math.max(...prices.slice(i - lookback, i))
    
    // Buy when price breaks above the previous 20-day high
    if (!inPosition && currentPrice > prevHigh) {
      const shares = Math.floor(capital / currentPrice)
      if (shares > 0) {
        position = shares
        entryPrice = currentPrice
        capital -= shares * currentPrice
        inPosition = true
        trades.push({
          date: dates[i],
          type: 'BUY',
          price: currentPrice,
          shares: shares,
          pnl: 0,
        })
      }
    }
    // Sell when price drops below the 20-day low
    else if (inPosition) {
      const prevLow = Math.min(...prices.slice(i - lookback, i))
      if (currentPrice < prevLow) {
        const pnl = (currentPrice - entryPrice) * position
        capital += position * currentPrice
        trades.push({
          date: dates[i],
          type: 'SELL',
          price: currentPrice,
          shares: position,
          pnl: pnl,
        })
        position = 0
        entryPrice = 0
        inPosition = false
      }
    }
  }
  
  if (inPosition) {
    const lastPrice = prices[prices.length - 1]
    const pnl = (lastPrice - entryPrice) * position
    capital += position * lastPrice
    trades.push({
      date: dates[dates.length - 1],
      type: 'SELL',
      price: lastPrice,
      shares: position,
      pnl: pnl,
    })
  }
  
  return calculateMetrics(trades, initialCapital, capital)
}

// Helper: Calculate metrics
function calculateMetrics(trades: any[], initialCapital: number, finalCapital: number) {
  const returns = trades.filter(t => t.type === 'SELL').map(t => t.pnl / (t.price * t.shares) * 100)
  const winRate = returns.length > 0 ? (returns.filter(r => r > 0).length / returns.length) * 100 : 0
  const totalTrades = trades.length / 2
  
  let maxDrawdown = 0
  let peak = initialCapital
  let currentValue = initialCapital
  
  for (const trade of trades) {
    currentValue += trade.pnl || 0
    if (currentValue > peak) peak = currentValue
    const drawdown = ((peak - currentValue) / peak) * 100
    if (drawdown > maxDrawdown) maxDrawdown = drawdown
  }
  
  const dailyReturns = trades.filter(t => t.type === 'SELL').map(t => t.pnl / (t.price * t.shares))
  const avgReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0
  const stdDev = Math.sqrt(dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + (b - avgReturn) ** 2, 0) / dailyReturns.length : 0.01)
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0
  
  const totalReturn = ((finalCapital - initialCapital) / initialCapital) * 100
  
  return { trades, finalCapital, totalReturn, maxDrawdown, sharpeRatio, winRate, totalTrades }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ticker, initialCapital = 10000, strategy = 'ma_crossover' } = body
    
    if (!ticker) {
      return NextResponse.json(
        { error: 'Missing ticker parameter' },
        { status: 400 }
      )
    }
    
    const data = await fetchHistoricalData(ticker, 504)
    if (!data || data.length < 50) {
      return NextResponse.json(
        { error: 'Insufficient historical data' },
        { status: 404 }
      )
    }
    
    let result
    let strategyName
    switch (strategy) {
      case 'ma_crossover':
        result = runMovingAverageCrossover(data, initialCapital)
        strategyName = 'Moving Average Crossover (20/50)'
        break
      case 'rsi_mean_reversion':
        result = runRSIMeanReversion(data, initialCapital)
        strategyName = 'RSI Mean Reversion (14, 30/70)'
        break
      case 'breakout':
        result = runBreakout(data, initialCapital)
        strategyName = 'Breakout (20-day high/low)'
        break
      default:
        result = runMovingAverageCrossover(data, initialCapital)
        strategyName = 'Moving Average Crossover (20/50)'
    }
    
    const response: BacktestResult = {
      ticker: ticker.toUpperCase(),
      strategy: strategyName,
      initialCapital,
      finalCapital: result.finalCapital,
      totalReturn: result.totalReturn,
      annualizedReturn: result.totalReturn / 2,
      maxDrawdown: result.maxDrawdown,
      sharpeRatio: result.sharpeRatio,
      winRate: result.winRate,
      totalTrades: result.totalTrades,
      trades: result.trades,
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Backtest error:', error)
    return NextResponse.json(
      { error: 'Failed to run backtest' },
      { status: 500 }
    )
  }
}