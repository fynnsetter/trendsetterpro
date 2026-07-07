import { NextRequest, NextResponse } from 'next/server'

interface AnalysisData {
  currentPrice: number
  summary?: {
    recommendation?: string
    confidence?: number
    riskLevel?: string
  }
  monteCarlo?: {
    probabilityOfProfit?: number
    expectedReturn?: number
    valueAtRisk?: number
    bestCase?: number
    worstCase?: number
    mostLikely?: number
  }
  technical?: {
    rsi?: number
    macd?: {
      macd: number
      signal: number
      histogram: number
    }
    movingAverages?: {
      ma50: number
      ma200: number
      ma50Above200: boolean
    }
    bollingerBands?: {
      upper: number
      middle: number
      lower: number
      percentB: number
    }
    volatility?: {
      daily: number
      annual: number
      beta: number
    }
    supportResistance?: {
      support: number
      resistance: number
    }
  }
  sentiment?: {
    bullish: number
    bearish: number
    neutral: number
    summary: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ticker, analysis } = body
    
    if (!ticker || !analysis) {
      return NextResponse.json(
        { error: 'Missing ticker or analysis data' },
        { status: 400 }
      )
    }

    const apiKey = process.env.CLAUDE_API_KEY
    
    // 🔥 FALLBACK: If no Claude API key, return a generated insight
    if (!apiKey) {
      console.log('No Claude API key, using fallback insight')
      return NextResponse.json({
        insight: generateFallbackInsight(ticker, analysis)
      })
    }

    // Build the prompt
    const prompt = `You are a professional investment analyst. Analyze the following stock data and provide clear, actionable advice.

STOCK: ${ticker}
CURRENT PRICE: £${analysis.currentPrice?.toFixed(2) || '0.00'}

QUANTITATIVE RECOMMENDATION: ${analysis.summary?.recommendation || 'Hold'} (Confidence: ${analysis.summary?.confidence || 50}%)
RISK LEVEL: ${analysis.summary?.riskLevel || 'Medium'}

TECHNICAL INDICATORS:
- RSI: ${analysis.technical?.rsi?.toFixed(1) || 'N/A'}
- MACD: ${analysis.technical?.macd?.macd?.toFixed(3) || 'N/A'}
- MA50: £${analysis.technical?.movingAverages?.ma50?.toFixed(2) || 'N/A'}
- MA200: £${analysis.technical?.movingAverages?.ma200?.toFixed(2) || 'N/A'}
- Trend: ${analysis.technical?.movingAverages?.ma50Above200 ? 'Bullish' : 'Bearish'}

MONTE CARLO:
- Probability of Profit: ${analysis.monteCarlo?.probabilityOfProfit ? (analysis.monteCarlo.probabilityOfProfit * 100).toFixed(1) : 'N/A'}%
- Expected Return: ${analysis.monteCarlo?.expectedReturn?.toFixed(1) || 'N/A'}%
- Value at Risk: ${analysis.monteCarlo?.valueAtRisk?.toFixed(1) || 'N/A'}%

Based on this data, provide a brief investment recommendation. Keep it to 2-3 sentences.`

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      const data = await response.json()

      if (response.ok) {
        return NextResponse.json({
          insight: data.content[0]?.text || generateFallbackInsight(ticker, analysis)
        })
      } else {
        console.error('Claude API error:', data)
        return NextResponse.json({
          insight: generateFallbackInsight(ticker, analysis)
        })
      }
    } catch (error) {
      console.error('Claude API error:', error)
      return NextResponse.json({
        insight: generateFallbackInsight(ticker, analysis)
      })
    }

  } catch (error) {
    console.error('Claude analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to get Claude analysis' },
      { status: 500 }
    )
  }
}

function generateFallbackInsight(ticker: string, analysis: AnalysisData): string {
  const rec = analysis.summary?.recommendation || 'Hold'
  const confidence = analysis.summary?.confidence || 50
  const probProfit = analysis.monteCarlo?.probabilityOfProfit || 0
  const expectedReturn = analysis.monteCarlo?.expectedReturn || 0
  const riskLevel = analysis.summary?.riskLevel || 'Medium'
  
  let sentiment = 'neutral'
  if (probProfit > 0.6 && expectedReturn > 5) sentiment = 'bullish'
  else if (probProfit < 0.4 || expectedReturn < -5) sentiment = 'bearish'
  
  return `## 📊 Investment Summary for ${ticker}

**Recommendation:** ${rec} (${confidence}% confidence)

**Key Metrics:**
- ${(probProfit * 100).toFixed(0)}% probability of profit
- ${expectedReturn > 0 ? '+' : ''}${expectedReturn.toFixed(1)}% expected return
- ${riskLevel} risk level

**Analysis:** The technical and fundamental indicators suggest a ${sentiment} outlook for ${ticker}. ${rec === 'Strong Buy' || rec === 'Buy' ? 'Consider adding to your position on dips.' : rec === 'Hold' ? 'Hold existing positions and monitor for a better entry point.' : 'Consider reducing exposure or setting tight stop-losses.'}

*Note: This is AI-generated analysis for informational purposes only.*`
}