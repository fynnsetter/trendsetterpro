'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Holding {
  id: string
  ticker: string
  shares: number
  avg_price: number
}

interface Recommendation {
  ticker: string
  action: string
  reason: string
  suggestedChange: number
  urgency: string
}

interface PairTrade {
  long: string
  short: string
  reason: string
  expectedReturn: number
}

export default function PortfolioAdvisor() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loadingUser, setLoadingUser] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        console.log('🔍 Current user ID:', user.id)
        
        // 🔥 TRY HARDCODED USER ID FOR TESTING
        const testUserId = '08bab30e-2c74-457a-a9ec-37250a57e129'
        
        // Try with the actual user ID first
        let { data, error } = await supabase
          .from('portfolios')
          .select('*')
          .eq('user_id', user.id)
        
        console.log('🔍 Holdings with user.id:', data?.length || 0)
        
        // If no holdings, try with hardcoded ID
        if (!data || data.length === 0) {
          console.log('🔍 Trying hardcoded user ID:', testUserId)
          const { data: hardcodedData, error: hardcodedError } = await supabase
            .from('portfolios')
            .select('*')
            .eq('user_id', testUserId)
          
          if (!hardcodedError && hardcodedData) {
            data = hardcodedData
            console.log('🔍 Holdings with hardcoded ID:', data?.length || 0)
          }
        }
        
        setHoldings(data || [])
      }
      setLoadingUser(false)
    }
    getUser()
  }, [])

  const runOptimization = async () => {
    if (holdings.length < 2) {
      setError(`Add at least 2 holdings to get portfolio advice (you have ${holdings.length})`)
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      // 🔥 Get the session token
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      console.log('🔍 Sending token:', token ? 'Yes' : 'No')

      if (!token) {
        setError('Please log in again')
        setLoading(false)
        return
      }

      const response = await fetch('/api/portfolio-optimization', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Failed to optimize portfolio')
      }
    } catch (err) {
      setError('Failed to connect to optimization engine')
    } finally {
      setLoading(false)
    }
  }

  if (loadingUser) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="text-center py-8">
          <p className="text-gray-400/70">Loading...</p>
        </div>
      </div>
    )
  }

  if (holdings.length < 2) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="text-center py-8">
          <p className="text-gray-400/70">Add at least 2 holdings to get portfolio optimization advice.</p>
          <p className="text-gray-400/50 text-sm mt-2">You currently have {holdings.length} holding{holdings.length !== 1 ? 's' : ''}.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-light text-gray-400/70">Portfolio Advisor</h3>
        <button
          onClick={runOptimization}
          disabled={loading}
          className="px-4 py-2 bg-[#d8bb6b] text-[#1a2332] font-semibold rounded-lg hover:bg-[#c4a45a] transition-all disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Get Portfolio Advice'}
        </button>
      </div>

      {error && (
        <div className="text-red-400 text-sm p-3 bg-red-500/10 rounded-lg mb-4">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <p className="text-gray-400/70 text-sm">Diversification Score</p>
              <p className="text-2xl font-bold text-white">{result.diversificationScore.toFixed(0)}%</p>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 mt-2">
              <div
                className="h-2 rounded-full bg-[#d8bb6b]"
                style={{ width: `${Math.min(result.diversificationScore, 100)}%` }}
              />
            </div>
            <p className="text-gray-400/70 text-xs mt-2">{result.message}</p>
          </div>

          {result.recommendations && result.recommendations.length > 0 && (
            <div>
              <p className="text-gray-400/70 text-xs uppercase tracking-wider mb-2">Recommended Actions</p>
              <div className="space-y-2">
                {result.recommendations.map((rec: Recommendation, i: number) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border ${
                      rec.action === 'Add'
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-white font-medium">
                          {rec.ticker}: <span className={rec.action === 'Add' ? 'text-green-400' : 'text-red-400'}>
                            {rec.action}
                          </span>
                        </p>
                        <p className="text-gray-400/70 text-sm">{rec.reason}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        rec.urgency === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {rec.urgency} Priority
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.pairTrades && result.pairTrades.length > 0 && (
            <div>
              <p className="text-gray-400/70 text-xs uppercase tracking-wider mb-2">Pair Trading Opportunities</p>
              <div className="space-y-2">
                {result.pairTrades.map((trade: PairTrade, i: number) => (
                  <div key={i} className="p-3 bg-white/5 rounded-lg border border-[#d8bb6b]/20">
                    <p className="text-white font-medium">
                      Long <span className="text-green-400">{trade.long}</span> / Short <span className="text-red-400">{trade.short}</span>
                    </p>
                    <p className="text-gray-400/70 text-sm">{trade.reason}</p>
                    <p className="text-[#d8bb6b] text-sm mt-1">Expected return: {trade.expectedReturn.toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}