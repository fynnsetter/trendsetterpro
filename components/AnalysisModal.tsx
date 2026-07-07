'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Plot from 'react-plotly.js'

interface AnalysisModalProps {
  ticker: string
  shares: number
  avgPrice: number
  onClose: () => void
}

interface AnalysisResult {
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
  summary?: {
    recommendation: string
  }
}

export default function AnalysisModal({ ticker, shares, avgPrice, onClose }: AnalysisModalProps) {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [PlotComponent, setPlotComponent] = useState<any>(null)

  useEffect(() => {
    import('react-plotly.js').then((mod) => {
      setPlotComponent(() => mod.default)
    })
  }, [])

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker }),
        })
        
        const data = await response.json()
        
        if (response.ok) {
          setResult(data)
        } else {
          setError(data.error || 'Failed to analyze stock')
        }
      } catch (err) {
        setError('Failed to connect to analysis engine')
      } finally {
        setLoading(false)
      }
    }
    
    fetchAnalysis()
  }, [ticker])

  // 🔥 SAVE ANALYSIS FUNCTION
  const saveAnalysis = async () => {
    if (!result) return
    
    setSaving(true)
    setSaveSuccess(false)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to save analyses')
        setSaving(false)
        return
      }
      
      const { error } = await supabase
        .from('saved_analyses')
        .insert([
          {
            user_id: user.id,
            ticker: result.ticker,
            current_price: result.currentPrice,
            probability_of_profit: result.probabilityOfProfit,
            expected_return: result.expectedReturn,
            value_at_risk: result.valueAtRisk,
            max_drawdown: result.maxDrawdown,
            forecast_best: result.forecast.bestCase,
            forecast_most_likely: result.forecast.mostLikely,
            forecast_worst: result.forecast.worstCase,
            recommendation: result.summary?.recommendation || '',
          },
        ])

      if (error) {
        alert('Failed to save analysis: ' + error.message)
      } else {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (error) {
      alert('Failed to save analysis. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const formatPercent = (num: number) => {
    return (num * 100).toFixed(1) + '%'
  }

  const formatCurrency = (num: number) => {
    return '£' + num.toFixed(2)
  }

  const getRecommendation = (result: AnalysisResult) => {
    const prob = result.probabilityOfProfit
    const expected = result.expectedReturn
    
    if (prob > 0.6 && expected > 5) {
      return { text: 'Strong Buy', color: 'text-green-400' }
    } else if (prob > 0.45 && expected > 0) {
      return { text: 'Hold', color: 'text-yellow-400' }
    } else if (prob > 0.35) {
      return { text: 'Hold', color: 'text-yellow-400' }
    } else {
      return { text: 'Consider Selling', color: 'text-red-400' }
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#1a2332] border border-white/10 rounded-2xl p-8 max-w-4xl w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-light text-white">Analyzing {ticker}...</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d8bb6b]"></div>
          </div>
          <p className="text-gray-400/70 text-center">Running 10,000 simulations...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#1a2332] border border-white/10 rounded-2xl p-8 max-w-4xl w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-light text-white">Analysis Failed</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
          </div>
          <div className="text-center py-8">
            <p className="text-red-400">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-[#d8bb6b] text-[#1a2332] rounded-lg hover:bg-[#c4a45a] transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!result) return null

  const recommendation = getRecommendation(result)
  const totalValue = shares * result.currentPrice
  const totalCost = shares * avgPrice
  const pnl = totalValue - totalCost
  const pnlPercent = (pnl / totalCost) * 100
  const days = result.percentiles.p50.length

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#1a2332] border border-white/10 rounded-2xl p-6 max-w-5xl w-full my-8">
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-light text-white">
              {result.ticker} <span className="text-[#d8bb6b]">Analysis</span>
            </h2>
            <p className="text-gray-400/70 text-sm">
              Current Price: <span className="text-white font-medium">{formatCurrency(result.currentPrice)}</span>
              {' • '}
              Your Avg: <span className="text-white font-medium">{formatCurrency(avgPrice)}</span>
              {' • '}
              <span className={pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)} ({pnlPercent.toFixed(1)}%)
              </span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-all text-xl">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-gray-400/70 text-xs uppercase tracking-wider">Probability of Profit</p>
            <p className={`text-2xl font-bold ${result.probabilityOfProfit >= 0.5 ? 'text-green-400' : 'text-red-400'}`}>
              {formatPercent(result.probabilityOfProfit)}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-gray-400/70 text-xs uppercase tracking-wider">Expected Return</p>
            <p className={`text-2xl font-bold ${result.expectedReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {result.expectedReturn >= 0 ? '+' : ''}{result.expectedReturn.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-gray-400/70 text-xs uppercase tracking-wider">Value at Risk (5%)</p>
            <p className="text-2xl font-bold text-red-400">
              {result.valueAtRisk.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-gray-400/70 text-xs uppercase tracking-wider">Max Drawdown</p>
            <p className="text-2xl font-bold text-orange-400">
              {result.maxDrawdown.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-gray-400/70 text-xs uppercase tracking-wider">Best Case</p>
            <p className="text-green-400 font-bold">{formatCurrency(result.forecast.bestCase)}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-gray-400/70 text-xs uppercase tracking-wider">Most Likely</p>
            <p className="text-white font-bold">{formatCurrency(result.forecast.mostLikely)}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-gray-400/70 text-xs uppercase tracking-wider">Worst Case</p>
            <p className="text-red-400 font-bold">{formatCurrency(result.forecast.worstCase)}</p>
          </div>
        </div>

        <div className={`mb-6 p-4 rounded-xl ${recommendation.color.replace('text-', 'bg-') + '/10 border border-' + recommendation.color.replace('text-', '') + '/30'}`}>
          <p className="text-center">
            <span className={`font-bold ${recommendation.color}`}>{recommendation.text}</span>
            <span className="text-gray-300/70 ml-2">
              based on {result.probabilityOfProfit > 0.6 ? 'strong bullish' : result.probabilityOfProfit > 0.4 ? 'neutral' : 'bearish'} probability signals
            </span>
          </p>
        </div>

        {PlotComponent && (
          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-light text-gray-400/70 mb-3">Monte Carlo Simulation (10,000 paths)</h3>
            <div className="h-80">
              <PlotComponent
                data={[
                  {
                    type: 'scatter',
                    mode: 'lines',
                    name: 'P90 (Bull)',
                    x: Array.from({ length: days }, (_, i) => i),
                    y: result.percentiles.p90,
                    line: { color: '#d8bb6b', width: 2 },
                    fill: 'tonexty',
                    fillcolor: 'rgba(216, 187, 107, 0.1)',
                  },
                  {
                    type: 'scatter',
                    mode: 'lines',
                    name: 'P50 (Median)',
                    x: Array.from({ length: days }, (_, i) => i),
                    y: result.percentiles.p50,
                    line: { color: '#ffffff', width: 2 },
                  },
                  {
                    type: 'scatter',
                    mode: 'lines',
                    name: 'P10 (Bear)',
                    x: Array.from({ length: days }, (_, i) => i),
                    y: result.percentiles.p10,
                    line: { color: '#ef4444', width: 2 },
                    fill: 'tonexty',
                    fillcolor: 'rgba(239, 68, 68, 0.1)',
                  },
                  {
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Current Price',
                    x: Array.from({ length: days }, (_, i) => i),
                    y: Array(days).fill(result.currentPrice),
                    line: { color: '#22c55e', width: 1, dash: 'dash' },
                  },
                ]}
                layout={{
                  paper_bgcolor: 'rgba(0,0,0,0)',
                  plot_bgcolor: 'rgba(0,0,0,0)',
                  font: { color: '#9ca3af' },
                  margin: { l: 50, r: 20, t: 20, b: 30 },
                  showlegend: true,
                  legend: {
                    orientation: 'h',
                    y: 1.1,
                    x: 0.5,
                    xanchor: 'center',
                    font: { color: '#9ca3af', size: 10 },
                  },
                  xaxis: {
                    gridcolor: 'rgba(255,255,255,0.05)',
                  },
                  yaxis: {
                    gridcolor: 'rgba(255,255,255,0.05)',
                    tickprefix: '£',
                  },
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        )}

        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-[#d8bb6b] text-sm font-bold">AI</span>
            <div>
              <p className="text-xs text-gray-400/70 uppercase tracking-wider mb-1">AI Insight</p>
              <p className="text-white/90 text-sm leading-relaxed">
                {result.probabilityOfProfit > 0.6 ? (
                  <>
                    Strong bullish signals detected. {result.ticker} has a <span className="text-green-400 font-medium">{formatPercent(result.probabilityOfProfit)}</span> probability 
                    of being higher in 12 months. The expected return of <span className="text-green-400 font-medium">{result.expectedReturn.toFixed(1)}%</span> 
                    with a Value at Risk of {result.valueAtRisk.toFixed(1)}% suggests a favorable risk-reward profile.
                  </>
                ) : result.probabilityOfProfit > 0.4 ? (
                  <>
                    Neutral signals detected. {result.ticker} has a <span className="text-yellow-400 font-medium">{formatPercent(result.probabilityOfProfit)}</span> probability 
                    of being higher in 12 months. The expected return of <span className="text-yellow-400 font-medium">{result.expectedReturn.toFixed(1)}%</span> 
                    with a Value at Risk of {result.valueAtRisk.toFixed(1)}% suggests a balanced risk-reward profile.
                  </>
                ) : (
                  <>
                    Bearish signals detected. {result.ticker} has a <span className="text-red-400 font-medium">{formatPercent(result.probabilityOfProfit)}</span> probability 
                    of being higher in 12 months. The expected return of <span className="text-red-400 font-medium">{result.expectedReturn.toFixed(1)}%</span> 
                    with a Value at Risk of {result.valueAtRisk.toFixed(1)}% suggests caution is warranted.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:bg-white/10 transition-all"
          >
            Close
          </button>
          <button 
            onClick={saveAnalysis}
            disabled={saving}
            className="flex-1 py-2.5 bg-[#d8bb6b] text-[#1a2332] font-semibold rounded-xl hover:bg-[#c4a45a] transition-all shadow-lg shadow-[#d8bb6b]/20 disabled:opacity-50"
          >
            {saving ? 'Saving...' : saveSuccess ? '✅ Saved!' : '💾 Save Analysis'}
          </button>
        </div>
      </div>
    </div>
  )
}