'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AnalysisButton from '@/components/AnalysisButton'

interface WatchlistItem {
  id: string
  ticker: string
  created_at: string
  current_price?: number
  change_percent?: number
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [newTicker, setNewTicker] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchWatchlist = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const { data, error } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching watchlist:', error)
      } else {
        const itemsWithPrices = await Promise.all(
          (data || []).map(async (item) => {
            try {
              const res = await fetch(`/api/stock-price?symbol=${item.ticker}`)
              const priceData = await res.json()
              return {
                ...item,
                current_price: priceData.price || null,
                change_percent: priceData.changePercent || 0,
              }
            } catch {
              return item
            }
          })
        )
        setItems(itemsWithPrices)
      }
      setLoading(false)
    }

    fetchWatchlist()
  }, [router])

  const addToWatchlist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTicker.trim()) return

    setAdding(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('watchlist')
      .insert([{ user_id: user.id, ticker: newTicker.toUpperCase() }])

    if (error) {
      alert('Failed to add: ' + error.message)
    } else {
      setNewTicker('')
      const { data } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      const itemsWithPrices = await Promise.all(
        (data || []).map(async (item) => {
          try {
            const res = await fetch(`/api/stock-price?symbol=${item.ticker}`)
            const priceData = await res.json()
            return {
              ...item,
              current_price: priceData.price || null,
              change_percent: priceData.changePercent || 0,
            }
          } catch {
            return item
          }
        })
      )
      setItems(itemsWithPrices)
    }
    setAdding(false)
  }

  const removeFromWatchlist = async (id: string) => {
    if (!confirm('Remove from watchlist?')) return
    
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Failed to remove: ' + error.message)
    } else {
      setItems(items.filter(item => item.id !== id))
    }
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
      <h1 className="text-2xl font-light text-white mb-6">Watchlist</h1>
      <p className="text-gray-400/70 mb-8">Track stocks you're interested in</p>

      <form onSubmit={addToWatchlist} className="flex gap-3 mb-8">
        <input
          type="text"
          placeholder="Enter ticker (e.g., AAPL)"
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value)}
          className="flex-1 px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder:text-gray-400/40 
          focus:outline-none focus:ring-2 focus:ring-[#d8bb6b]/60"
          required
        />
        <button
          type="submit"
          disabled={adding}
          className="px-6 py-3 bg-[#d8bb6b] text-[#1a2332] font-semibold rounded-xl hover:bg-[#c4a45a] transition-all disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {items.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <p className="text-gray-400/70">Your watchlist is empty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all"
            >
              <div className="flex justify-between items-start">
                <Link href={`/stock/${item.ticker}`} className="flex-1">
                  <p className="text-white font-bold text-lg">{item.ticker}</p>
                  {item.current_price && (
                    <p className="text-gray-400 text-sm">
                      £{item.current_price.toFixed(2)}
                      {item.change_percent !== 0 && (
                        <span className={`ml-2 ${(item.change_percent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(item.change_percent || 0) >= 0 ? '+' : ''}{item.change_percent?.toFixed(2)}%
                        </span>
                      )}
                    </p>
                  )}
                  <p className="text-gray-400/50 text-xs mt-1">
                    Added: {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </Link>
                <div className="flex flex-col items-end gap-2">
                  <AnalysisButton 
                    ticker={item.ticker}
                    shares={1}
                    avgPrice={item.current_price || 0}
                  />
                  <button
                    onClick={() => removeFromWatchlist(item.id)}
                    className="text-red-400/50 hover:text-red-400 transition-all text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}