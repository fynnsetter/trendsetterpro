'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Suggestion {
  ticker: string
  allocation: number
  expectedReturn: number
  volatility: number
  reason: string
  sector: string
  assetClass: string
}

interface Result {
  suggestions: Suggestion[]
  portfolioReturn: number
  portfolioRisk: number
  projectedValue: number
  projectedMin: number
  projectedMax: number
  insight: string
  timeframe: string
  amount: number
  riskTolerance: string
  probabilityOfProfit?: number
}

export default function PortfolioBuilder() {
  const [isPro, setIsPro] = useState(false)
  const [loadingUser, setLoadingUser] = useState(true)
  const [amount, setAmount] = useState('100')
  const [timeframe, setTimeframe] = useState('3')
  const [riskTolerance, setRiskTolerance] = useState('moderate')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [addSuccess, setAddSuccess] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [investmentAmount, setInvestmentAmount] = useState('')
  const router = useRouter()

  useEffect(() => {
    const checkPro = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('tier')
          .eq('id', user.id)
          .single()
        setIsPro(data?.tier === 'pro')
      }
      setLoadingUser(false)
    }
    checkPro()
  }, [])

  const timeframes = [
    { value: '1', label: '1 Month' },
    { value: '3', label: '3 Months' },
    { value: '6', label: '6 Months' },
    { value: '12', label: '1 Year' },
  ]

  const riskLevels = [
    { value: 'conservative', label: 'Conservative' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'aggressive', label: 'Aggressive' },
  ]

  const getAssetClassLabel = (assetClass: string): string => {
    const labels: Record<string, string> = {
      equity: 'Stock',
      etf: 'ETF',
      commodity: 'Commodity',
      reit: 'REIT',
    }
    return labels[assetClass] || 'Stock'
  }

  const getAssetClassColor = (assetClass: string): string => {
    const colors: Record<string, string> = {
      equity: 'text-blue-400',
      etf: 'text-purple-400',
      commodity: 'text-yellow-400',
      reit: 'text-green-400',
    }
    return colors[assetClass] || 'text-gray-400'
  }

  const runBuilder = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    setAddSuccess(false)

    try {
      const response = await fetch('/api/portfolio-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          timeframe: parseInt(timeframe),
          riskTolerance,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Failed to build portfolio')
      }
    } catch (err) {
      setError('Failed to connect to portfolio builder')
    } finally {
      setLoading(false)
    }
  }

  // 🔥 UPDATED: Add to portfolio with duplicate checking
  const addToPortfolio = async () => {
    const investAmount = parseFloat(investmentAmount)
    if (isNaN(investAmount) || investAmount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setAdding(true)
    setAddSuccess(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to add to portfolio')
        setAdding(false)
        return
      }

      // Get existing holdings for this user
      const { data: existingHoldings, error: fetchError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)

      if (fetchError) {
        console.error('Error fetching existing holdings:', fetchError)
      }

      // Deduct cash
      const { error: cashError } = await supabase
        .from('cash')
        .insert([
          {
            user_id: user.id,
            amount: -investAmount,
            type: 'withdrawal',
            description: `Portfolio Builder investment of £${investAmount.toFixed(2)}`,
          },
        ])

      if (cashError) {
        console.error('Error deducting cash:', cashError)
        alert('Failed to deduct cash balance. Please check your cash balance.')
        setAdding(false)
        return
      }

      // For each suggestion, check if it already exists
      for (const suggestion of result!.suggestions) {
        const allocation = suggestion.allocation / 100
        const amountToInvest = investAmount * allocation
        
        const priceRes = await fetch(`/api/stock-price?symbol=${suggestion.ticker}`)
        const priceData = await priceRes.json()
        const currentPrice = priceData.price
        
        if (!currentPrice) {
          console.error(`Could not fetch price for ${suggestion.ticker}, skipping...`)
          continue
        }
        
        const shares = amountToInvest / currentPrice

        // Check if this ticker already exists in the user's portfolio
        const existing = existingHoldings?.find(h => h.ticker === suggestion.ticker)

        if (existing) {
          // Update existing holding - add to shares and recalculate avg price
          const totalShares = existing.shares + shares
          const totalCost = (existing.shares * existing.avg_price) + (shares * currentPrice)
          const newAvgPrice = totalCost / totalShares

          const { error } = await supabase
            .from('portfolios')
            .update({
              shares: totalShares,
              avg_price: newAvgPrice,
            })
            .eq('id', existing.id)

          if (error) {
            console.error('Error updating stock:', error)
          }
        } else {
          // Insert new holding
          const { error } = await supabase
            .from('portfolios')
            .insert([
              {
                user_id: user.id,
                ticker: suggestion.ticker,
                shares: shares,
                avg_price: currentPrice,
                purchase_date: new Date().toISOString().split('T')[0],
              },
            ])

          if (error) {
            console.error('Error adding stock:', error)
          }
        }
      }

      setAddSuccess(true)
      setTimeout(() => {
        setShowAddModal(false)
        window.location.href = '/dashboard/overview'
      }, 1500)

    } catch (error) {
      console.error('Error adding to portfolio:', error)
      alert('Failed to add stocks to portfolio')
    } finally {
      setAdding(false)
    }
  }

  const MetricTooltip = ({ label, value, description }: { label: string, value: React.ReactNode, description: string }) => (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 group relative">
      <p className="text-gray-400/70 text-xs uppercase tracking-wider flex items-center gap-1">
        {label}
        <span className="inline-block cursor-help text-gray-500 text-xs border border-gray-500 rounded-full w-4 h-4 text-center leading-4 hover:border-[#d8bb6b] hover:text-[#d8bb6b] transition-all">
          ?
        </span>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-[#1a2332] border border-white/10 rounded-lg text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          {description}
        </span>
      </p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  )

  if (loadingUser) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="text-center py-8">
          <p className="text-gray-400/70">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isPro) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
        <div className="flex justify-center mb-4">
          <span className="text-4xl">🔒</span>
        </div>
        <h3 className="text-xl font-light text-white">AI Portfolio Builder</h3>
        <p className="text-gray-400/70 mt-2 max-w-md mx-auto">
          Get AI-powered portfolio recommendations with advanced Monte Carlo simulations and 300+ stocks.
        </p>
        <div className="mt-6 space-y-2 text-sm text-gray-300/80">
          <p>✓ 300+ stocks, ETFs, and commodities</p>
          <p>✓ Advanced Monte Carlo simulations</p>
          <p>✓ Sector diversification analysis</p>
          <p>✓ AI-powered recommendations</p>
        </div>
        <Link
          href="/dashboard/settings"
          className="inline-block mt-6 px-6 py-2 bg-[#d8bb6b] text-[#1a2332] font-semibold rounded-lg hover:bg-[#c4a45a] transition-all"
        >
          Upgrade to Pro — £4.99/month
        </Link>
      </div>
    )
  }

  return (
    <div>
      <form onSubmit={runBuilder} className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-light text-white mb-4">AI Portfolio Builder</h3>
        <p className="text-gray-400/70 text-sm mb-6">
          Tell us your investment goals and we'll build a personalized portfolio.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-gray-200/70 font-light text-sm tracking-wide mb-1.5">
              Investment Amount (£)
            </label>
            <input
              type="number"
              min="10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder:text-gray-400/40 
              focus:outline-none focus:ring-2 focus:ring-[#d8bb6b]/60"
              required
            />
          </div>

          <div>
            <label className="block text-gray-200/70 font-light text-sm tracking-wide mb-1.5">
              Timeframe
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white
              focus:outline-none focus:ring-2 focus:ring-[#d8bb6b]/60"
            >
              {timeframes.map((tf) => (
                <option key={tf.value} value={tf.value} className="bg-[#1a2332]">
                  {tf.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-200/70 font-light text-sm tracking-wide mb-1.5">
              Risk Tolerance
            </label>
            <select
              value={riskTolerance}
              onChange={(e) => setRiskTolerance(e.target.value)}
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white
              focus:outline-none focus:ring-2 focus:ring-[#d8bb6b]/60"
            >
              {riskLevels.map((rl) => (
                <option key={rl.value} value={rl.value} className="bg-[#1a2332]">
                  {rl.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 bg-[#d8bb6b] text-[#1a2332] font-semibold py-3 rounded-xl hover:bg-[#c4a45a] transition-all disabled:opacity-50"
        >
          {loading ? 'Building portfolio...' : 'Build My Portfolio'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricTooltip
              label="Projected Value"
              value={`£${result.projectedValue.toFixed(2)}`}
              description="Estimated value after the selected timeframe based on Monte Carlo simulations."
            />
            <MetricTooltip
              label="Expected Return"
              value={`+${result.portfolioReturn.toFixed(1)}%`}
              description="Average predicted return based on historical performance of selected stocks."
            />
            <MetricTooltip
              label="Risk Level"
              value={result.portfolioRisk < 20 ? 'Low' : result.portfolioRisk < 30 ? 'Medium' : 'High'}
              description="Based on portfolio volatility. Higher risk = larger potential swings."
            />
            <MetricTooltip
              label="Profit"
              value={`+£${(result.projectedValue - result.amount).toFixed(2)}`}
              description={`${(result.probabilityOfProfit || 0.5) * 100}% probability of making a profit.`}
            />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h4 className="text-white font-medium mb-4">Recommended Allocation</h4>
            <div className="space-y-3">
              {result.suggestions.map((stock, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">{stock.ticker}</span>
                      <span className={`text-xs ${getAssetClassColor(stock.assetClass)}`}>
                        {getAssetClassLabel(stock.assetClass)}
                      </span>
                      <span className="text-gray-400/70 text-sm">{stock.reason}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 mt-1">
                      <div
                        className="h-1.5 rounded-full bg-[#d8bb6b]"
                        style={{ width: `${stock.allocation}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <span className="text-white font-medium">{stock.allocation.toFixed(0)}%</span>
                    <p className="text-gray-400/50 text-xs">
                      {stock.expectedReturn > 0 ? '+' : ''}{stock.expectedReturn.toFixed(1)}% return
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 border border-[#d8bb6b]/20 rounded-xl p-4">
            <p className="text-[#d8bb6b] text-xs uppercase tracking-wider mb-1">AI Insight</p>
            <p className="text-white/90 text-sm leading-relaxed">{result.insight}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex-1 py-3 bg-[#d8bb6b] text-[#1a2332] font-semibold rounded-xl hover:bg-[#c4a45a] transition-all"
            >
              Add to Portfolio
            </button>
            <button
              onClick={() => setResult(null)}
              className="flex-1 py-3 bg-white/5 border border-white/10 text-white/70 rounded-xl hover:bg-white/10 transition-all"
            >
              Start Over
            </button>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-gray-400/50 text-xs">
              ⚠️ This is a simulation based on historical data. Past performance does not guarantee future results.
              Always do your own research before investing.
            </p>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2332] border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-light text-white">Add to Portfolio</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white transition-all"
              >
                ✕
              </button>
            </div>

            {addSuccess ? (
              <div className="text-center py-8">
                <div className="text-green-400 text-4xl mb-4">✅</div>
                <p className="text-white font-medium">Portfolio Updated!</p>
                <p className="text-gray-400/70 text-sm mt-2">Your stocks have been added at current market prices.</p>
              </div>
            ) : (
              <>
                <p className="text-gray-400/70 text-sm mb-4">
                  How much would you like to invest in this portfolio?
                </p>

                <div className="flex gap-2 mb-4 flex-wrap">
                  {[100, 500, 1000, 5000].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setInvestmentAmount(preset.toString())}
                      className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/70 text-sm hover:bg-white/10 transition-all"
                    >
                      £{preset}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  placeholder="Enter amount (£)"
                  value={investmentAmount}
                  onChange={(e) => setInvestmentAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder:text-gray-400/40 
                  focus:outline-none focus:ring-2 focus:ring-[#d8bb6b]/60 mb-4"
                />

                <div className="flex gap-3">
                  <button
                    onClick={addToPortfolio}
                    disabled={adding}
                    className="flex-1 py-3 bg-[#d8bb6b] text-[#1a2332] font-semibold rounded-xl hover:bg-[#c4a45a] transition-all disabled:opacity-50"
                  >
                    {adding ? 'Adding...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 bg-white/5 border border-white/10 text-white/70 rounded-xl hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}