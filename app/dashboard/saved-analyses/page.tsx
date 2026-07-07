'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface SavedAnalysis {
  id: string
  ticker: string
  current_price: number
  probability_of_profit: number
  expected_return: number
  value_at_risk: number
  max_drawdown: number
  forecast_best: number
  forecast_most_likely: number
  forecast_worst: number
  recommendation: string
  created_at: string
}

export default function SavedAnalysesPage() {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const fetchSaved = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const { data, error } = await supabase
        .from('saved_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching saved analyses:', error)
        setError('Failed to load saved analyses')
      } else {
        setAnalyses(data || [])
      }
      setLoading(false)
    }

    fetchSaved()
  }, [router])

  const deleteAnalysis = async (id: string) => {
    if (!confirm('Delete this saved analysis?')) return

    const { error } = await supabase
      .from('saved_analyses')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Failed to delete')
    } else {
      setAnalyses(analyses.filter(a => a.id !== id))
    }
  }

  const formatPercent = (num: number) => {
    return (num * 100).toFixed(1) + '%'
  }

  const formatCurrency = (num: number) => {
    return '£' + num.toFixed(2)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-light text-white mb-2">Saved Analyses</h1>
          <p className="text-gray-400/70">Your saved Monte Carlo simulation results</p>
        </div>
        <Link
          href="/dashboard/analysis"
          className="px-4 py-2 bg-[#d8bb6b] text-[#1a2332] font-semibold rounded-lg hover:bg-[#c4a45a] transition-all"
        >
          + New Analysis
        </Link>
      </div>

      {error && (
        <div className="text-red-400 text-sm p-3 bg-red-500/10 rounded-lg mb-4">
          {error}
        </div>
      )}

      {analyses.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <p className="text-gray-400/70">No saved analyses yet.</p>
          <Link
            href="/dashboard/analysis"
            className="inline-block mt-4 text-[#d8bb6b] hover:underline"
          >
            Run your first analysis →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analyses.map((analysis) => (
            <div key={analysis.id} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-[#d8bb6b]/30 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white">{analysis.ticker}</h3>
                  <p className="text-gray-400/70 text-sm">
                    Saved: {new Date(analysis.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => deleteAnalysis(analysis.id)}
                  className="text-red-400/50 hover:text-red-400 transition-all"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-gray-400/70 text-xs">Prob. of Profit</p>
                  <p className="text-white font-bold text-sm">{formatPercent(analysis.probability_of_profit)}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-gray-400/70 text-xs">Expected Return</p>
                  <p className={`font-bold text-sm ${analysis.expected_return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {analysis.expected_return >= 0 ? '+' : ''}{analysis.expected_return.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-gray-400/70 text-xs">VaR</p>
                  <p className="text-red-400 font-bold text-sm">{analysis.value_at_risk.toFixed(1)}%</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-2">
                <div className="bg-white/5 rounded-lg p-1.5 text-center">
                  <p className="text-gray-400/70 text-[10px]">Worst</p>
                  <p className="text-red-400 text-xs font-bold">{formatCurrency(analysis.forecast_worst)}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-1.5 text-center">
                  <p className="text-gray-400/70 text-[10px]">Most Likely</p>
                  <p className="text-white text-xs font-bold">{formatCurrency(analysis.forecast_most_likely)}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-1.5 text-center">
                  <p className="text-gray-400/70 text-[10px]">Best</p>
                  <p className="text-green-400 text-xs font-bold">{formatCurrency(analysis.forecast_best)}</p>
                </div>
              </div>

              {analysis.recommendation && (
                <div className="mt-2 p-2 bg-white/5 rounded-lg">
                  <p className="text-gray-400/70 text-xs">Recommendation</p>
                  <p className="text-white text-sm">{analysis.recommendation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}