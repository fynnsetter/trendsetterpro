'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CashManager from '@/components/CashManager'
import AnalysisButton from '@/components/AnalysisButton'
import PortfolioChart from '@/components/PortfolioChart'
import AllocationChart from '@/components/AllocationChart'
import PortfolioAdvisor from '@/components/PortfolioAdvisor'
import PortfolioBuilder from '@/components/PortfolioBuilder'
import LoadingSpinner from '@/components/LoadingSpinner'

interface Holding {
  id: string
  ticker: string
  shares: number
  avg_price: number
  purchase_date: string
  current_price?: number
  pnl?: number
  pnlPercent?: number
}

export default function OverviewPage() {
  const [user, setUser] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [pricesLoading, setPricesLoading] = useState(false)
  const [cashBalance, setCashBalance] = useState(0)
  const [refreshCash, setRefreshCash] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      setUser(user)
      setFullName(user?.user_metadata?.full_name || user?.email)

      const { data: userData } = await supabase
        .from('users')
        .select('tier')
        .eq('id', user.id)
        .single()
      
      setIsPro(userData?.tier === 'pro')

      const { data: holdingsData, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching holdings:', error)
        setLoading(false)
        return
      }

      setHoldings(holdingsData || [])
      
      if (holdingsData && holdingsData.length > 0) {
        await fetchLivePrices(holdingsData)
      }
      
      setLoading(false)
    }

    getUser()
  }, [router])

  const fetchLivePrices = async (holdingsData: Holding[]) => {
    setPricesLoading(true)
    
    try {
      const symbols = holdingsData.map(h => h.ticker)
      const response = await fetch('/api/stock-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
      })
      
      const data = await response.json()
      
      if (response.ok && data.prices) {
        const updatedHoldings = holdingsData.map(holding => {
          const currentPrice = data.prices[holding.ticker]
          if (currentPrice) {
            const pnl = (currentPrice - holding.avg_price) * holding.shares
            const pnlPercent = ((currentPrice - holding.avg_price) / holding.avg_price) * 100
            return {
              ...holding,
              current_price: currentPrice,
              pnl,
              pnlPercent,
            }
          }
          return holding
        })
        setHoldings(updatedHoldings)
      }
    } catch (error) {
      console.error('Error fetching live prices:', error)
    } finally {
      setPricesLoading(false)
    }
  }

  const deleteHolding = async (holding: Holding) => {
    if (!user) return

    if (!confirm(`Are you sure you want to delete ${holding.ticker}? The value will be added back to your cash balance.`)) return
    
    try {
      const valueToAdd = holding.shares * holding.avg_price

      const { error: deleteError } = await supabase
        .from('portfolios')
        .delete()
        .eq('id', holding.id)
      
      if (deleteError) {
        console.error('Error deleting holding:', deleteError)
        alert('Failed to delete holding. Please try again.')
        return
      }

      const { error: cashError } = await supabase
        .from('cash')
        .insert([
          {
            user_id: user.id,
            amount: valueToAdd,
            type: 'deposit',
            description: `Sold ${holding.ticker} (${holding.shares} shares at £${holding.avg_price.toFixed(2)})`,
          },
        ])

      if (cashError) {
        console.error('Error adding to cash:', cashError)
        alert('Holding deleted but failed to update cash balance. Please add manually.')
      }

      setHoldings(holdings.filter(h => h.id !== holding.id))
      setRefreshCash(!refreshCash)

    } catch (error) {
      console.error('Error:', error)
      alert('Something went wrong. Please try again.')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const exportCSV = async () => {
    if (holdings.length === 0) {
      alert('No holdings to export')
      return
    }

    setExporting('csv')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          type: 'csv',
          holdings: holdings.map(h => ({
            ticker: h.ticker,
            shares: h.shares,
            avg_price: h.avg_price,
            current_price: h.current_price || h.avg_price,
            purchase_date: h.purchase_date,
          }))
        }),
      })
      
      if (!response.ok) throw new Error('Export failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `portfolio-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export CSV')
    } finally {
      setExporting(null)
    }
  }

  const exportPDF = async () => {
    if (holdings.length === 0) {
      alert('No holdings to export')
      return
    }

    setExporting('pdf')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          type: 'pdf',
          holdings: holdings.map(h => ({
            ticker: h.ticker,
            shares: h.shares,
            avg_price: h.avg_price,
            current_price: h.current_price || h.avg_price,
            purchase_date: h.purchase_date,
          }))
        }),
      })
      
      if (!response.ok) throw new Error('Export failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `portfolio-${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export PDF')
    } finally {
      setExporting(null)
    }
  }

  const totalValue = holdings.reduce((sum, h) => {
    const price = h.current_price || h.avg_price
    return sum + h.shares * price
  }, 0)

  const totalCost = holdings.reduce((sum, h) => sum + h.shares * h.avg_price, 0)
  const totalPnl = totalValue - totalCost
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

  // 🔥 Show ALL holdings (including those with 0 shares)
  const validHoldings = holdings

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-light text-white">
            Welcome back, <span className="text-[#d8bb6b] font-bold">{fullName}</span>
          </h1>
          <p className="text-gray-400/70 mt-1">Your AI-powered investment dashboard</p>
        </div>
        <div className="flex gap-3">
          <Link 
            href="/add-stock" 
            className="px-4 py-2 bg-[#d8bb6b] text-[#1a2332] font-semibold rounded-lg hover:bg-[#c4a45a] transition-all"
          >
            Add Stock
          </Link>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 hover:border-white/20 transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <p className="text-gray-400/70 text-sm">Portfolio Value</p>
          <p className="text-3xl font-bold text-white mt-2">
            £{totalValue.toFixed(2)}
          </p>
          <p className="text-gray-400/50 text-sm mt-1">{validHoldings.length} holdings</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <p className="text-gray-400/70 text-sm">Cost Basis</p>
          <p className="text-3xl font-bold text-white mt-2">
            £{totalCost.toFixed(2)}
          </p>
          <p className="text-gray-400/50 text-sm mt-1">Total invested</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <p className="text-gray-400/70 text-sm">Total P&L</p>
          <p className={`text-3xl font-bold mt-2 ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnl >= 0 ? '+' : ''}£{totalPnl.toFixed(2)}
          </p>
          <p className={`text-sm mt-1 ${totalPnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnlPercent >= 0 ? '+' : ''}{totalPnlPercent.toFixed(2)}%
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <p className="text-gray-400/70 text-sm">Net Worth</p>
          <p className="text-3xl font-bold text-white mt-2">
            £{(totalValue + cashBalance).toFixed(2)}
          </p>
          <p className="text-gray-400/50 text-sm mt-1">Portfolio + Cash</p>
        </div>
      </div>

      {/* Cash Manager */}
      <div className="mt-8">
        <CashManager 
          userId={user?.id} 
          onCashUpdate={(balance) => setCashBalance(balance)}
          refreshTrigger={refreshCash}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <PortfolioChart holdings={holdings} />
        <AllocationChart holdings={holdings} />
      </div>

      {/* Portfolio Advisor - Gated Behind Pro */}
      <div className="mt-8">
        {isPro ? (
          <PortfolioAdvisor />
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <span className="text-4xl text-gray-500">🔒</span>
            </div>
            <h3 className="text-xl font-light text-white">Portfolio Advisor</h3>
            <p className="text-gray-400/70 mt-2 max-w-md mx-auto">
              Get AI-powered portfolio optimization, diversification scores, and pair trading signals.
            </p>
            <Link
              href="/dashboard/settings"
              className="inline-block mt-4 px-6 py-2 bg-[#d8bb6b] text-[#1a2332] font-semibold rounded-lg hover:bg-[#c4a45a] transition-all"
            >
              Upgrade to Pro
            </Link>
          </div>
        )}
      </div>

      {/* AI Portfolio Builder - Always Visible */}
      <div className="mt-8">
        <PortfolioBuilder />
      </div>

      {/* Holdings Table */}
      <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-light text-white">Your Holdings</h2>
          {pricesLoading && (
            <span className="text-gray-400/50 text-sm">Updating prices...</span>
          )}
        </div>
        
        {validHoldings.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4 text-gray-500">📈</div>
            <h3 className="text-xl font-light text-white">No holdings yet</h3>
            <p className="text-gray-400/70 mt-2">Add your first stock to start tracking your portfolio.</p>
            <Link 
              href="/add-stock" 
              className="inline-block mt-4 px-6 py-2 bg-[#d8bb6b] text-[#1a2332] font-semibold rounded-lg hover:bg-[#c4a45a] transition-all"
            >
              Add Stock
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 text-gray-400/70 font-light">Ticker</th>
                  <th className="text-right py-3 text-gray-400/70 font-light">Shares</th>
                  <th className="text-right py-3 text-gray-400/70 font-light">Avg Price</th>
                  <th className="text-right py-3 text-gray-400/70 font-light">Current Price</th>
                  <th className="text-right py-3 text-gray-400/70 font-light">Total Value</th>
                  <th className="text-right py-3 text-gray-400/70 font-light">P&L</th>
                  <th className="text-right py-3 text-gray-400/70 font-light">Purchase Date</th>
                  <th className="text-right py-3 text-gray-400/70 font-light">Action</th>
                </tr>
              </thead>
              <tbody>
                {validHoldings.map((holding) => (
                  <tr key={holding.id} className="border-b border-white/5">
                    <td className="py-3 text-white font-medium">{holding.ticker}</td>
                    <td className="py-3 text-white text-right">{holding.shares.toFixed(4)}</td>
                    <td className="py-3 text-white text-right">£{holding.avg_price.toFixed(2)}</td>
                    <td className="py-3 text-white text-right">
                      {holding.current_price ? (
                        `£${holding.current_price.toFixed(2)}`
                      ) : (
                        <span className="text-gray-400/50">—</span>
                      )}
                    </td>
                    <td className="py-3 text-white text-right">
                      £{(holding.shares * (holding.current_price || holding.avg_price)).toFixed(2)}
                    </td>
                    <td className="py-3 text-right">
                      {holding.pnl !== undefined && holding.pnl !== null ? (
                        <span className={holding.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {holding.pnl >= 0 ? '+' : ''}£{holding.pnl.toFixed(2)}
                          <br />
                          <span className="text-xs">
                            {holding.pnlPercent !== undefined && holding.pnlPercent !== null ? (
                              <>
                                {holding.pnlPercent >= 0 ? '+' : ''}{holding.pnlPercent.toFixed(2)}%
                              </>
                            ) : (
                              '—'
                            )}
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-400/50">—</span>
                      )}
                    </td>
                    <td className="py-3 text-gray-400/70 text-right">
                      {new Date(holding.purchase_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <AnalysisButton 
                          ticker={holding.ticker}
                          shares={holding.shares}
                          avgPrice={holding.avg_price}
                        />
                        <button
                          onClick={() => deleteHolding(holding)}
                          className="text-red-400/50 hover:text-red-400 transition-all text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export Buttons */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={exportCSV}
          disabled={exporting !== null}
          className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all text-sm border border-white/10 disabled:opacity-50"
        >
          {exporting === 'csv' ? 'Exporting...' : 'Export CSV'}
        </button>
        <button
          onClick={exportPDF}
          disabled={exporting !== null}
          className="px-4 py-2 bg-[#d8bb6b]/20 text-[#d8bb6b] rounded-lg hover:bg-[#d8bb6b]/30 transition-all text-sm border border-[#d8bb6b]/20 disabled:opacity-50"
        >
          {exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}
        </button>
      </div>
    </div>
  )
}