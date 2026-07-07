'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isPro, setIsPro] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)

      const { data: userData } = await supabase
        .from('users')
        .select('tier')
        .eq('id', user.id)
        .single()
      
      setIsPro(userData?.tier === 'pro')
      setLoading(false)
    }
    getUser()
  }, [router])

  const handleUpgrade = async () => {
    setUpgrading(true)
    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          email: user?.email,
        }),
      })

      const data = await response.json()

      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        alert('Failed to start checkout. Please try again.')
      }
    } catch (error) {
      console.error('Upgrade error:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setUpgrading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
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
      <h1 className="text-2xl font-light text-white mb-6">Settings</h1>
      <p className="text-gray-400/70 mb-8">Manage your account and preferences</p>

      <div className="space-y-6 max-w-2xl">
        {/* Account */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-white font-medium mb-4">Account</h3>
          <p className="text-gray-400/70 text-sm">Email</p>
          <p className="text-white mb-4">{user?.email}</p>
          
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all border border-red-500/20"
          >
            Sign Out
          </button>
        </div>

        {/* Subscription */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-white font-medium mb-4">Subscription</h3>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-400/70 text-sm">Current Plan</p>
              <p className={`text-xl font-bold ${isPro ? 'text-[#d8bb6b]' : 'text-gray-400'}`}>
                {isPro ? 'Pro' : 'Free'}
              </p>
              {isPro ? (
                <p className="text-gray-400/50 text-xs">Unlimited AI analysis and portfolio tools</p>
              ) : (
                <p className="text-gray-400/50 text-xs">5 AI analyses per month. Upgrade to Pro for unlimited access.</p>
              )}
            </div>
            {!isPro && (
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="px-6 py-2 bg-[#d8bb6b] text-[#1a2332] font-semibold rounded-lg hover:bg-[#c4a45a] transition-all disabled:opacity-50"
              >
                {upgrading ? 'Processing...' : 'Upgrade to Pro'}
              </button>
            )}
          </div>
        </div>

        {/* Pro Features */}
        {!isPro && (
          <div className="bg-white/5 border border-[#d8bb6b]/20 rounded-xl p-6">
            <h3 className="text-[#d8bb6b] font-medium mb-4">✨ Pro Features</h3>
            <ul className="space-y-2 text-gray-300/80 text-sm">
              <li>✓ Unlimited AI analysis with Claude</li>
              <li>✓ Portfolio Advisor (diversification, pair trading)</li>
              <li>✓ Backtesting engine</li>
              <li>✓ Price alerts and notifications</li>
              <li>✓ Export reports (PDF/CSV)</li>
            </ul>
            <button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="mt-4 w-full py-2 bg-[#d8bb6b] text-[#1a2332] font-semibold rounded-lg hover:bg-[#c4a45a] transition-all disabled:opacity-50"
            >
              {upgrading ? 'Processing...' : 'Upgrade Now — £4.99/month'}
            </button>
          </div>
        )}

        {/* Terminology Guide */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-white font-medium mb-4">Investment Terminology</h3>
          <p className="text-gray-400/70 text-sm mb-4">
            Learn what RSI, MACD, VaR, and other metrics mean — and what's good vs bad.
          </p>
          <Link
            href="/terminology"
            className="inline-block px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-all"
          >
            View Terminology Guide →
          </Link>
        </div>

        {/* About */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-white font-medium mb-4">About TrendSetter</h3>
          <p className="text-gray-400/70 text-sm mb-4">
            Learn how our AI-powered investment tools work and understand the metrics we use.
          </p>
          <Link
            href="/about"
            className="inline-block px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-all"
          >
            View Methodology →
          </Link>
        </div>
      </div>
    </div>
  )
}