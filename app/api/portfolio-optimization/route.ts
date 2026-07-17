import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface Holding {
  id: string
  ticker: string
  shares: number
  avg_price: number
  purchase_date: string
  current_price?: number
}

interface StockData {
  ticker: string
  currentPrice: number
  expectedReturn: number
  volatility: number
  correlation: number
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    let userId = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data, error } = await supabase.auth.getUser(token)
      
      if (error) {
        console.error('Token error:', error)
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        )
      }
      
      if (data.user) {
        userId = data.user.id
        console.log('✅ User from token:', userId)
      }
    }

    if (!userId) {
      console.error('❌ No user found in token')
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const { data: holdings, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)

    console.log('🔍 Holdings found:', holdings?.length || 0)

    if (error) {
      console.error('Error fetching holdings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch holdings' },
        { status: 500 }
      )
    }

    if (!holdings || holdings.length < 2) {
      return NextResponse.json({
        message: `Add at least 2 holdings to get portfolio optimization advice (you have ${holdings?.length || 0})`,
        recommendations: [],
        pairTrades: [],
        diversificationScore: 0,
        holdingsCount: holdings?.length || 0,
      })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://trendsetterpro.vercel.app'

    const stockData: StockData[] = []

    for (const holding of holdings) {
      try {
        const priceRes = await fetch(`${baseUrl}/api/stock-price?symbol=${holding.ticker}`)
        const priceData = await priceRes.json()

        const analysisRes = await fetch(`${baseUrl}/api/ultimate-analysis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker: holding.ticker }),
        })
        const analysisData = await analysisRes.json()

        stockData.push({
          ticker: holding.ticker,
          currentPrice: priceData.price || holding.avg_price,
          expectedReturn: analysisData.monteCarlo?.expectedReturn || 0,
          volatility: analysisData.technical?.volatility?.annual || 0.2,
          correlation: 0,
        })
      } catch (err) {
        console.error(`Error fetching data for ${holding.ticker}:`, err)
      }
    }

    if (stockData.length < 2) {
      return NextResponse.json({
        message: 'Could not fetch data for enough holdings',
        recommendations: [],
        pairTrades: [],
        diversificationScore: 0,
      })
    }

    const correlations: { [key: string]: { [key: string]: number } } = {}
    
    const techStocks = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META', 'TSLA']
    const financeStocks = ['JPM', 'BAC', 'GS', 'V', 'MA']
    const consumerStocks = ['AMZN', 'NFLX', 'WMT', 'DIS']
    const energyStocks = ['XOM', 'CVX', 'BP', 'SHEL']

    const getSector = (ticker: string): string => {
      if (techStocks.includes(ticker)) return 'tech'
      if (financeStocks.includes(ticker)) return 'finance'
      if (consumerStocks.includes(ticker)) return 'consumer'
      if (energyStocks.includes(ticker)) return 'energy'
      return 'other'
    }

    for (const stock of stockData) {
      correlations[stock.ticker] = {}
      for (const otherStock of stockData) {
        if (stock.ticker === otherStock.ticker) {
          correlations[stock.ticker][otherStock.ticker] = 1.0
        } else {
          const sector1 = getSector(stock.ticker)
          const sector2 = getSector(otherStock.ticker)
          if (sector1 === sector2) {
            correlations[stock.ticker][otherStock.ticker] = 0.7
          } else if (sector1 === 'tech' && sector2 === 'consumer') {
            correlations[stock.ticker][otherStock.ticker] = 0.5
          } else if (sector1 === 'tech' && sector2 === 'finance') {
            correlations[stock.ticker][otherStock.ticker] = 0.3
          } else if (sector1 === 'finance' && sector2 === 'tech') {
            correlations[stock.ticker][otherStock.ticker] = 0.3
          } else {
            correlations[stock.ticker][otherStock.ticker] = 0.2
          }
        }
      }
    }

    const totalHoldings = stockData.length
    let diversificationScore = 0
    for (const stock of stockData) {
      for (const otherStock of stockData) {
        if (stock.ticker !== otherStock.ticker) {
          diversificationScore += 1 - Math.abs(correlations[stock.ticker][otherStock.ticker])
        }
      }
    }
    diversificationScore = (diversificationScore / (totalHoldings * (totalHoldings - 1))) * 100

    const recommendations = []
    
    for (const stock of stockData) {
      const sharpe = stock.expectedReturn / (stock.volatility * 100)
      if (sharpe < 0.2 && stock.volatility > 0.25) {
        recommendations.push({
          ticker: stock.ticker,
          action: 'Reduce',
          reason: `High volatility (${(stock.volatility * 100).toFixed(1)}%) with low expected return (${stock.expectedReturn.toFixed(1)}%)`,
          suggestedChange: -15,
          urgency: 'Medium',
        })
      }
    }

    for (const stock of stockData) {
      const sharpe = stock.expectedReturn / (stock.volatility * 100)
      if (sharpe > 0.5) {
        recommendations.push({
          ticker: stock.ticker,
          action: 'Add',
          reason: `Strong risk-adjusted return (Sharpe: ${sharpe.toFixed(2)})`,
          suggestedChange: 15,
          urgency: 'High',
        })
      }
    }

    const pairTrades = []
    for (let i = 0; i < stockData.length; i++) {
      for (let j = i + 1; j < stockData.length; j++) {
        const stock1 = stockData[i]
        const stock2 = stockData[j]
        const correlation = correlations[stock1.ticker][stock2.ticker]
        
        if (correlation > 0.6 && stock1.expectedReturn > stock2.expectedReturn + 5) {
          pairTrades.push({
            long: stock1.ticker,
            short: stock2.ticker,
            reason: `High correlation (${(correlation * 100).toFixed(0)}%) but ${stock1.ticker} has ${(stock1.expectedReturn - stock2.expectedReturn).toFixed(1)}% better expected return`,
            expectedReturn: stock1.expectedReturn - stock2.expectedReturn,
          })
        } else if (correlation > 0.6 && stock2.expectedReturn > stock1.expectedReturn + 5) {
          pairTrades.push({
            long: stock2.ticker,
            short: stock1.ticker,
            reason: `High correlation (${(correlation * 100).toFixed(0)}%) but ${stock2.ticker} has ${(stock2.expectedReturn - stock1.expectedReturn).toFixed(1)}% better expected return`,
            expectedReturn: stock2.expectedReturn - stock1.expectedReturn,
          })
        }
      }
    }

    return NextResponse.json({
      diversificationScore: Math.min(diversificationScore, 100),
      holdings: stockData.map(s => ({
        ticker: s.ticker,
        expectedReturn: s.expectedReturn,
        volatility: s.volatility,
        sharpeRatio: s.expectedReturn / (s.volatility * 100),
      })),
      recommendations,
      pairTrades: pairTrades.slice(0, 3),
      correlationMatrix: Object.entries(correlations).map(([ticker, corr]) => ({
        ticker,
        correlations: corr,
      })),
      message: `Your portfolio has a diversification score of ${Math.min(diversificationScore, 100).toFixed(0)}%. ${Math.min(diversificationScore, 100) > 60 ? 'Good diversification!' : 'Consider adding different sectors.'}`,
    })

  } catch (error) {
    console.error('Portfolio optimization error:', error)
    return NextResponse.json(
      { error: 'Failed to optimize portfolio' },
      { status: 500 }
    )
  }
}