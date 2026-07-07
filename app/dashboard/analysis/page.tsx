'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AnalysisButton from '@/components/AnalysisButton'
import AIInsight from '@/components/AIInsight'
import BacktestButton from '@/components/BacktestButton'
import LoadingSpinner from '@/components/LoadingSpinner'

interface Holding {
  id: string
  ticker: string
  shares: number
  avg_price: number
  purchase_date: string
  current_price?: number
}

export default function AnalysisPage() {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [isPro, setIsPro] = useState(false)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('tier')
        .eq('id', user.id)
        .single()
      
      setIsPro(userData?.tier === 'pro')

      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching holdings:', error)
      } else {
        const holdingsWithPrices = await Promise.all(
          (data || []).map(async (holding) => {
            try {
              const res = await fetch(`/api/stock-price?symbol=${holding.ticker}`)
              const priceData = await res.json()
              return {
                ...holding,
                current_price: priceData.price || holding.avg_price,
              }
            } catch {
              return holding
            }
          })
        )
        setHoldings(holdingsWithPrices)
      }
      setLoading(false)
    }

    fetchData()
  }, [router])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-light text-white mb-2">AI Analysis</h1>
          <p className="text-gray-400/70">Run Monte Carlo simulations and get AI-powered insights on your holdings</p>
        </div>
        <div className="flex gap-3">
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
      
      {holdings.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <p className="text-gray-400/70">No holdings to analyze.</p>
          <Link href="/add-stock" className="inline-block mt-4 text-[#d8bb6b] hover:underline">
            Add your first stock →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {holdings.map((holding) => (
            <div key={holding.id} className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{holding.ticker}</h3>
                  <p className="text-gray-400/70 text-sm">
                    {holding.shares} shares • Avg: £{holding.avg_price.toFixed(2)}
                    {holding.current_price && (
                      <span className="ml-2 text-gray-400">
                        • Current: £{holding.current_price.toFixed(2)}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <AnalysisButton 
                    ticker={holding.ticker}
                    shares={holding.shares}
                    avgPrice={holding.avg_price}
                  />
                  <Link
                    href={`/stock/${holding.ticker}`}
                    className="px-3 py-1.5 bg-white/5 text-white/70 text-xs font-medium rounded-lg hover:bg-white/10 transition-all border border-white/10"
                  >
                    View Chart
                  </Link>
                  <BacktestButton ticker={holding.ticker} isPro={isPro} />
                </div>
              </div>
              <AIInsight ticker={holding.ticker} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}