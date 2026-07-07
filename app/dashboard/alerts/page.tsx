'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Alert {
  id: string
  ticker: string
  target_price: number
  condition: string
  triggered: boolean
  created_at: string
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [ticker, setTicker] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [condition, setCondition] = useState('above')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  useEffect(() => {
    const fetchAlerts = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching alerts:', error)
      } else {
        setAlerts(data || [])
      }
      setLoading(false)
    }

    fetchAlerts()
  }, [router])

  const addAlert = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticker || !targetPrice) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Please log in')
        setSaving(false)
        return
      }

      const { error } = await supabase
        .from('alerts')
        .insert([
          {
            user_id: user.id,
            ticker: ticker.toUpperCase(),
            target_price: parseFloat(targetPrice),
            condition: condition,
            triggered: false,
          },
        ])

      if (error) {
        setError(error.message)
      } else {
        setSuccess(`Alert set for ${ticker.toUpperCase()} at £${targetPrice}`)
        setTicker('')
        setTargetPrice('')
        // Refresh list
        const { data } = await supabase
          .from('alerts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        setAlerts(data || [])
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      setError('Failed to create alert')
    } finally {
      setSaving(false)
    }
  }

  const deleteAlert = async (id: string) => {
    if (!confirm('Delete this alert?')) return

    const { error } = await supabase
      .from('alerts')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Failed to delete')
    } else {
      setAlerts(alerts.filter(a => a.id !== id))
    }
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
      <h1 className="text-2xl font-light text-white mb-6">Price Alerts</h1>
      <p className="text-gray-400/70 mb-8">Get notified when stocks hit your target prices.</p>

      {/* Add Alert Form */}
      <form onSubmit={addAlert} className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-gray-200/70 font-light text-sm mb-1.5">Ticker</label>
            <input
              type="text"
              placeholder="AAPL"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-lg text-white placeholder:text-gray-400/40 
              focus:outline-none focus:ring-2 focus:ring-[#d8bb6b]/60"
              required
            />
          </div>

          <div>
            <label className="block text-gray-200/70 font-light text-sm mb-1.5">Target Price (£)</label>
            <input
              type="number"
              step="0.01"
              placeholder="150.00"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-lg text-white placeholder:text-gray-400/40 
              focus:outline-none focus:ring-2 focus:ring-[#d8bb6b]/60"
              required
            />
          </div>

          <div>
            <label className="block text-gray-200/70 font-light text-sm mb-1.5">Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-lg text-white
              focus:outline-none focus:ring-2 focus:ring-[#d8bb6b]/60"
            >
              <option value="above">Above</option>
              <option value="below">Below</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-[#d8bb6b] text-[#1a2332] font-semibold rounded-lg hover:bg-[#c4a45a] transition-all disabled:opacity-50"
            >
              {saving ? 'Setting...' : 'Set Alert'}
            </button>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        {success && <p className="text-green-400 text-sm mt-3">{success}</p>}
      </form>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <p className="text-gray-400/70">No alerts set yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.map((alert) => (
            <div key={alert.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-lg">{alert.ticker}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    alert.condition === 'above' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {alert.condition}
                  </span>
                </div>
                <p className="text-gray-400/70 text-sm">
                  Target: {formatCurrency(alert.target_price)}
                </p>
                <p className="text-gray-400/50 text-xs">
                  Created: {new Date(alert.created_at).toLocaleDateString()}
                </p>
                {alert.triggered && (
                  <p className="text-[#d8bb6b] text-xs mt-1">✅ Triggered!</p>
                )}
              </div>
              <button
                onClick={() => deleteAlert(alert.id)}
                className="text-red-400/50 hover:text-red-400 transition-all"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}