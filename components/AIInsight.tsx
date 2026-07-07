'use client'

import { useState } from 'react'

interface AnalysisResult {
  ticker: string
  currentPrice: number
  technical: {
    rsi: number
    macd: {
      macd: number
      signal: number
      histogram: number
    }
    movingAverages: {
      ma50: number
      ma200: number
      ma50Above200: boolean
    }
    bollingerBands: {
      upper: number
      middle: number
      lower: number
      percentB: number
    }
    volatility: {
      daily: number
      annual: number
      beta: number
    }
    supportResistance: {
      support: number
      resistance: number
    }
  }
  monteCarlo: {
    probabilityOfProfit: number
    expectedReturn: number
    valueAtRisk: number
    maxDrawdown: number
    bestCase: number
    worstCase: number
    mostLikely: number
  }
  sentiment: {
    score: number
    bullish: number
    bearish: number
    neutral: number
    summary: string
  }
  summary: {
    recommendation: string
    confidence: number
    riskLevel: string
  }
}

interface AIInsightProps {
  ticker: string
}

export default function AIInsight({ ticker }: AIInsightProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [claudeInsight, setClaudeInsight] = useState<string | null>(null)
  const [claudeLoading, setClaudeLoading] = useState(false)
  const [error, setError] = useState('')

  const runAnalysis = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    setClaudeInsight(null)

    try {
      const response = await fetch('/api/ultimate-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        await getClaudeInsight(data)
      } else {
        setError(data.error || 'Failed to analyse stock')
      }
    } catch (err) {
      setError('Failed to connect to analysis engine')
    } finally {
      setLoading(false)
    }
  }

  const getClaudeInsight = async (analysisData: AnalysisResult) => {
    setClaudeLoading(true)
    try {
      const response = await fetch('/api/claude-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: ticker,
          analysis: analysisData,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setClaudeInsight(data.insight || generateFallbackInsight(analysisData))
      } else {
        setClaudeInsight(generateFallbackInsight(analysisData))
      }
    } catch (error) {
      setClaudeInsight(generateFallbackInsight(analysisData))
    } finally {
      setClaudeLoading(false)
    }
  }

  const generateFallbackInsight = (analysis: AnalysisResult): string => {
    const rec = analysis.summary.recommendation
    const confidence = analysis.summary.confidence
    const probProfit = analysis.monteCarlo.probabilityOfProfit * 100
    const expectedReturn = analysis.monteCarlo.expectedReturn
    
    return `Action: ${rec} (${confidence}% confidence)`
  }

  const getRecommendationColor = (rec: string): string => {
    if (rec.includes('Strong Buy') || rec.includes('Buy')) return 'text-green-400'
    if (rec.includes('Hold')) return 'text-yellow-400'
    if (rec.includes('Sell')) return 'text-red-400'
    return 'text-gray-400'
  }

  const getRecommendationBg = (rec: string): string => {
    if (rec.includes('Strong Buy') || rec.includes('Buy')) return 'bg-green-500/10 border-green-500/30'
    if (rec.includes('Hold')) return 'bg-yellow-500/10 border-yellow-500/30'
    if (rec.includes('Sell')) return 'bg-red-500/10 border-red-500/30'
    return 'bg-gray-500/10 border-gray-500/30'
  }

  const getRiskColor = (risk: string): string => {
    if (risk === 'Low') return 'text-green-400'
    if (risk === 'Medium') return 'text-yellow-400'
    if (risk === 'High') return 'text-red-400'
    return 'text-gray-400'
  }

  const formatPercent = (num: number): string => {
    return num.toFixed(1) + '%'
  }

  const formatCurrency = (num: number): string => {
    return '£' + num.toFixed(2)
  }

  // Clean decimal spacing (e.g., "78. 3%" → "78.3%")
  const cleanDecimalSpacing = (text: string): string => {
    return text.replace(/(\d+)\.\s+(\d+)/g, '$1.$2')
  }

  // 🔥 SIMPLE APPROACH: Split by sentence boundaries, no decimal messing
  const parseInsight = (text: string) => {
    if (!text) return { action: 'Hold', summary: '', reasoning: '', decision: '' }

    let action = 'Hold'
    const actionKeywords = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell']
    for (const keyword of actionKeywords) {
      if (text.includes(keyword)) {
        action = keyword
        break
      }
    }

    // Clean the text
    let cleanedText = text
      .replace(/\*\*/g, '')
      .replace(/###/g, '')
      .replace(/\n/g, ' ')
      .trim()

    // Fix decimal spacing
    cleanedText = cleanDecimalSpacing(cleanedText)

    // 🔥 Split on periods, question marks, or exclamation points that end sentences
    // Use a simple approach: split on .!? that are followed by a space
    const sentenceArray = cleanedText
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 10)

    if (sentenceArray.length === 0) {
      return { action, summary: cleanedText, reasoning: '', decision: cleanedText }
    }

    // First sentence = Summary
    const summary = sentenceArray[0].trim()

    // Last 2 sentences = Decision
    const decisionSentences = sentenceArray.slice(-2)
    const decision = decisionSentences.join(' ').trim()

    // Everything in between = Reasoning
    let reasoning = ''
    if (sentenceArray.length > 3) {
      reasoning = sentenceArray.slice(1, sentenceArray.length - 2).join(' ').trim()
    }

    // Final clean pass
    const finalClean = (str: string) => str.replace(/(\d+)\.\s+(\d+)/g, '$1.$2')

    return {
      action,
      summary: finalClean(summary) || 'Analysis in progress...',
      reasoning: finalClean(reasoning) || '',
      decision: finalClean(decision) || 'Hold position and monitor.'
    }
  }

  const renderInsight = (text: string) => {
    const { action, summary, reasoning, decision } = parseInsight(text)

    return (
      <div className="space-y-4">
        <div className={`p-4 rounded-lg text-center border ${getRecommendationBg(action)}`}>
          <p className="text-xs text-gray-400 uppercase tracking-wider">What To Do</p>
          <p className={`text-2xl font-bold ${getRecommendationColor(action)}`}>
            {action}
          </p>
        </div>

        {summary && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">In Plain English</p>
            <p className="text-white/90 text-sm leading-relaxed">{summary}</p>
          </div>
        )}

        {reasoning && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Why</p>
            <p className="text-white/80 text-sm leading-relaxed">{reasoning}</p>
          </div>
        )}

        {decision && (
          <div className="bg-white/5 rounded-lg p-3 border border-white/5">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">What To Do Next</p>
            <p className="text-white font-medium text-sm">{decision}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-light text-gray-400">AI Analysis: {ticker}</h3>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="px-4 py-2 bg-[#d8bb6b] text-[#1a2332] font-semibold rounded-lg hover:bg-[#c4a45a] transition-all disabled:opacity-50 text-sm"
        >
          {loading ? 'Analysing...' : 'Run AI Analysis'}
        </button>
      </div>

      {error && (
        <div className="text-red-400 text-sm p-3 bg-red-500/10 rounded-lg mb-4">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/5">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Rec</p>
              <p className={`text-xl font-bold ${getRecommendationColor(result.summary.recommendation)}`}>
                {result.summary.recommendation}
              </p>
            </div>
            <div className="text-right ml-auto">
              <p className="text-gray-400 text-xs uppercase tracking-wider">Confidence</p>
              <p className="text-white text-xl font-bold">{result.summary.confidence}%</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-xs uppercase tracking-wider">Risk</p>
              <p className={`text-xl font-bold ${getRiskColor(result.summary.riskLevel)}`}>
                {result.summary.riskLevel}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs">Current Price</p>
              <p className="text-white text-lg font-bold">{formatCurrency(result.currentPrice)}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs">Prob. of Profit</p>
              <p className={`text-lg font-bold ${result.monteCarlo.probabilityOfProfit > 0.5 ? 'text-green-400' : 'text-red-400'}`}>
                {formatPercent(result.monteCarlo.probabilityOfProfit * 100)}
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs">Expected Return</p>
              <p className={`text-lg font-bold ${result.monteCarlo.expectedReturn > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {result.monteCarlo.expectedReturn > 0 ? '+' : ''}{formatPercent(result.monteCarlo.expectedReturn)}
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs">RSI</p>
              <p className="text-white text-lg font-bold">{result.technical.rsi.toFixed(1)}</p>
              <p className="text-xs text-gray-500">
                {result.technical.rsi < 30 ? 'Oversold' : result.technical.rsi > 70 ? 'Overbought' : 'Neutral'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-red-500/5 rounded-lg p-2 text-center border border-red-500/10">
              <p className="text-gray-400 text-xs">Worst</p>
              <p className="text-red-400 text-md font-bold">{formatCurrency(result.monteCarlo.worstCase)}</p>
              <p className="text-xs text-gray-500">10% chance</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2 text-center border border-white/10">
              <p className="text-gray-400 text-xs">Most Likely</p>
              <p className="text-white text-md font-bold">{formatCurrency(result.monteCarlo.mostLikely)}</p>
              <p className="text-xs text-gray-500">Median</p>
            </div>
            <div className="bg-green-500/5 rounded-lg p-2 text-center border border-green-500/10">
              <p className="text-gray-400 text-xs">Best</p>
              <p className="text-green-400 text-md font-bold">{formatCurrency(result.monteCarlo.bestCase)}</p>
              <p className="text-xs text-gray-500">90% chance</p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 bg-white/5 rounded-lg p-2 text-center">
              <p className="text-gray-400 text-xs">Support</p>
              <p className="text-white text-md font-bold">{formatCurrency(result.technical.supportResistance.support)}</p>
            </div>
            <div className="flex-1 bg-white/5 rounded-lg p-2 text-center">
              <p className="text-gray-400 text-xs">Resistance</p>
              <p className="text-white text-md font-bold">{formatCurrency(result.technical.supportResistance.resistance)}</p>
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-2 text-center">
            <p className="text-gray-400 text-xs">Sentiment</p>
            <div className="flex justify-center gap-3 text-sm">
              <span className="text-green-400">Bullish {result.sentiment.bullish}%</span>
              <span className="text-gray-400">Neutral {result.sentiment.neutral}%</span>
              <span className="text-red-400">Bearish {result.sentiment.bearish}%</span>
            </div>
          </div>

          {claudeLoading ? (
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm">Getting insights...</p>
            </div>
          ) : claudeInsight ? (
            <div className="bg-white/5 rounded-lg p-4 border border-[#d8bb6b]/20">
              <p className="text-[#d8bb6b] text-xs uppercase tracking-wider mb-3">AI Investment Advisor</p>
              {renderInsight(claudeInsight)}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}