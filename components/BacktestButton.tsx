'use client'

import { useState, useEffect } from 'react'
import Plot from 'react-plotly.js'

interface Trade {
  date: string
  type: 'BUY' | 'SELL'
  price: number
  shares: number
  pnl: number
}

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
  trades: Trade[]
}

interface BacktestButtonProps {
  ticker: string
  isPro?: boolean
}

const STRATEGIES = [
  { value: 'ma_crossover', label: 'MA Crossover (20/50)' },
  { value: 'rsi_mean_reversion', label: 'RSI Mean Reversion' },
  { value: 'breakout', label: 'Breakout (20-day)' },
]

export default function BacktestButton({ ticker, isPro = false }: BacktestButtonProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [PlotComponent, setPlotComponent] = useState<any>(null)
  const [selectedStrategy, setSelectedStrategy] = useState('ma_crossover')

  useEffect(() => {
    import('react-plotly.js').then((mod) => {
      setPlotComponent(() => mod.default)
    })
  }, [])

  const runBacktest = async () => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ticker, 
          initialCapital: 10000,
          strategy: selectedStrategy,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        setShowModal(true)
      } else {
        setError(data.error || 'Failed to run backtest')
      }
    } catch (err) {
      setError('Failed to connect to backtest engine')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (num: number) => {
    return '£' + num.toFixed(2)
  }

  const formatPercent = (num: number) => {
    return (num > 0 ? '+' : '') + num.toFixed(1) + '%'
  }

  if (!isPro) {
    return (
      <button
        disabled
        className="px-3 py-1.5 bg-gray-500/20 text-gray-400 text-xs font-medium rounded-lg cursor-not-allowed"
        title="Upgrade to Pro to use Backtesting"
      >
        🔒 Backtest
      </button>
    )
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <select
          value={selectedStrategy}
          onChange={(e) => setSelectedStrategy(e.target.value)}
          className="px-2 py-1.5 bg-black/20 border border-white/10 rounded-lg text-white/80 text-xs focus:outline-none focus:ring-1 focus:ring-[#d8bb6b]/50"
        >
          {STRATEGIES.map((s) => (
            <option key={s.value} value={s.value} className="bg-[#1a2332]">
              {s.label}
            </option>
          ))}
        </select>
        <button
          onClick={runBacktest}
          disabled={loading}
          className="px-3 py-1.5 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-lg hover:bg-purple-500/30 transition-all border border-purple-500/20 hover:border-purple-500/40 disabled:opacity-50"
        >
          {loading ? 'Running...' : '📊 Backtest'}
        </button>
      </div>

      {/* Results Modal - same as before */}
      {showModal && result && PlotComponent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#1a2332] border border-white/10 rounded-2xl p-6 max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-light text-white">
                  {result.ticker} <span className="text-purple-400">Backtest</span>
                </h2>
                <p className="text-gray-400/70 text-sm">{result.strategy}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white transition-all text-xl"
              >
                ✕
              </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-gray-400/70 text-xs uppercase tracking-wider">Total Return</p>
                <p className={`text-2xl font-bold ${result.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercent(result.totalReturn)}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-gray-400/70 text-xs uppercase tracking-wider">Annualized Return</p>
                <p className={`text-2xl font-bold ${result.annualizedReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercent(result.annualizedReturn)}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-gray-400/70 text-xs uppercase tracking-wider">Max Drawdown</p>
                <p className="text-2xl font-bold text-red-400">
                  {formatPercent(-result.maxDrawdown)}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-gray-400/70 text-xs uppercase tracking-wider">Sharpe Ratio</p>
                <p className={`text-2xl font-bold ${result.sharpeRatio >= 1 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {result.sharpeRatio.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-gray-400/70 text-xs uppercase tracking-wider">Win Rate</p>
                <p className="text-white text-xl font-bold">{result.winRate.toFixed(0)}%</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-gray-400/70 text-xs uppercase tracking-wider">Total Trades</p>
                <p className="text-white text-xl font-bold">{result.totalTrades}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-gray-400/70 text-xs uppercase tracking-wider">Final Capital</p>
                <p className="text-[#d8bb6b] text-xl font-bold">{formatCurrency(result.finalCapital)}</p>
              </div>
            </div>

            {/* Equity Curve */}
            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <h4 className="text-sm font-light text-gray-400/70 mb-3">Equity Curve</h4>
              <div className="h-48">
                <PlotComponent
                  data={[
                    {
                      type: 'scatter',
                      mode: 'lines',
                      name: 'Portfolio Value',
                      x: result.trades.map(t => t.date),
                      y: result.trades.reduce((acc: number[], t, i) => {
                        const prev = i === 0 ? result.initialCapital : acc[i-1]
                        const newValue = prev + (t.type === 'SELL' ? t.pnl : 0)
                        acc.push(newValue)
                        return acc
                      }, []),
                      line: { color: '#8b5cf6', width: 2 },
                      fill: 'tozeroy',
                      fillcolor: 'rgba(139, 92, 246, 0.1)',
                    },
                  ]}
                  layout={{
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    font: { color: '#9ca3af' },
                    margin: { l: 50, r: 20, t: 20, b: 30 },
                    xaxis: {
                      gridcolor: 'rgba(255,255,255,0.05)',
                    },
                    yaxis: {
                      gridcolor: 'rgba(255,255,255,0.05)',
                      tickprefix: '£',
                    },
                    showlegend: false,
                  }}
                  useResizeHandler={true}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>

            {/* Trade History */}
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="text-sm font-light text-gray-400/70 mb-3">Trade History</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 text-gray-400/70 font-light">Date</th>
                      <th className="text-left py-2 text-gray-400/70 font-light">Type</th>
                      <th className="text-right py-2 text-gray-400/70 font-light">Price</th>
                      <th className="text-right py-2 text-gray-400/70 font-light">Shares</th>
                      <th className="text-right py-2 text-gray-400/70 font-light">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((trade, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-2 text-white/80">{trade.date}</td>
                        <td className={`py-2 font-medium ${trade.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.type}
                        </td>
                        <td className="py-2 text-white/80 text-right">{formatCurrency(trade.price)}</td>
                        <td className="py-2 text-white/80 text-right">{trade.shares}</td>
                        <td className={`py-2 text-right ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.pnl !== 0 ? formatCurrency(trade.pnl) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:bg-white/10 transition-all"
              >
                Close
              </button>
              <button
                className="flex-1 py-2.5 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 transition-all"
              >
                Export Results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}