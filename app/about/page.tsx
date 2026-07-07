'use client'

import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

export default function AboutPage() {
  const [isPro, setIsPro] = useState(false)

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
    }
    checkPro()
  }, [])

  return (
    <div className="min-h-screen bg-[#1a2332] p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard" className="text-[#d8bb6b] hover:underline mb-6 inline-block">
          ← Back to Dashboard
        </Link>

        <h1 className="text-3xl font-light text-white mb-2">About TrendSetter</h1>
        <p className="text-gray-400/70 mb-8">
          Understanding how our AI-powered investment tools work.
        </p>

        {/* Pro Features Section */}
        <div className="bg-white/5 border border-[#d8bb6b]/30 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-light text-[#d8bb6b] mb-3">⭐ Pro Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white font-medium">Unlimited AI Analysis</p>
              <p className="text-gray-400/70 text-sm">Free users get 5 analyses per month. Pro users get unlimited access to Claude-powered investment insights.</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white font-medium">Portfolio Advisor</p>
              <p className="text-gray-400/70 text-sm">Get diversification scores, pair trading signals, and portfolio optimization recommendations.</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white font-medium">Backtesting Engine</p>
              <p className="text-gray-400/70 text-sm">Test trading strategies on historical data and see how they would have performed.</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white font-medium">Price Alerts</p>
              <p className="text-gray-400/70 text-sm">Set price targets and get notified when your stocks hit them.</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white font-medium">Export Reports</p>
              <p className="text-gray-400/70 text-sm">Download PDF and CSV reports of your portfolio and analysis.</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white font-medium">Advanced Portfolio Builder</p>
              <p className="text-gray-400/70 text-sm">Get AI-powered portfolio recommendations with 300+ stocks and advanced Monte Carlo simulations.</p>
            </div>
          </div>
          {!isPro && (
            <div className="mt-4 text-center">
              <Link
                href="/dashboard/settings"
                className="inline-block px-6 py-2 bg-[#d8bb6b] text-[#1a2332] font-semibold rounded-lg hover:bg-[#c4a45a] transition-all"
              >
                Upgrade to Pro — £4.99/month
              </Link>
            </div>
          )}
        </div>

        {/* Portfolio Builder */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-light text-[#d8bb6b] mb-3">📊 Portfolio Builder</h2>
          <p className="text-gray-300/80 text-sm leading-relaxed mb-3">
            The Portfolio Builder uses a multi-layered approach to recommend optimal portfolios:
          </p>
          <ul className="space-y-2 text-sm text-gray-400/70 list-disc pl-4">
            <li>
              <span className="text-white/90">1. Stock Screening:</span> We scan 300+ stocks across all sectors, fetching real-time data from Yahoo Finance.
            </li>
            <li>
              <span className="text-white/90">2. Risk-Adjusted Scoring:</span> Each stock is scored based on your risk tolerance.
            </li>
            <li>
              <span className="text-white/90">3. Monte Carlo Simulation:</span> We run 1,000 simulations of your portfolio's future performance.
            </li>
            <li>
              <span className="text-white/90">4. Diversification:</span> We ensure your portfolio is spread across different sectors to reduce risk.
            </li>
          </ul>
          <div className="mt-3 p-3 bg-white/5 rounded-lg">
            <p className="text-xs text-gray-400/50">
              💡 <span className="font-medium">Example:</span> A £100 portfolio with moderate risk over 3 months might show a projected value of £110, with a 68% probability of profit.
            </p>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mt-6">
          <h2 className="text-xl font-light text-[#d8bb6b] mb-3">🤖 AI Analysis</h2>
          <p className="text-gray-300/80 text-sm leading-relaxed mb-3">
            Our AI analysis combines multiple data sources to provide investment insights:
          </p>
          <ul className="space-y-2 text-sm text-gray-400/70 list-disc pl-4">
            <li>
              <span className="text-white/90">Technical Indicators:</span> We calculate RSI, MACD, Moving Averages, and Bollinger Bands.
            </li>
            <li>
              <span className="text-white/90">Volatility & Risk:</span> We measure historical volatility and calculate Value at Risk (VaR).
            </li>
            <li>
              <span className="text-white/90">Monte Carlo Simulation:</span> We run 10,000 simulations to forecast future price ranges.
            </li>
            <li>
              <span className="text-white/90">Claude AI:</span> We use Anthropic's Claude to interpret the data and provide professional advice.
            </li>
          </ul>
          <div className="mt-3 p-3 bg-white/5 rounded-lg">
            <p className="text-xs text-gray-400/50">
              💡 <span className="font-medium">Note:</span> AI-generated advice is for informational purposes only. Always do your own research before investing.
            </p>
          </div>
        </div>

        {/* Key Metrics Explained */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mt-6">
          <h2 className="text-xl font-light text-[#d8bb6b] mb-3">📈 Key Metrics Explained</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white font-medium text-sm">RSI (Relative Strength Index)</p>
              <p className="text-gray-400/70 text-xs mt-1">
                Measures momentum. Below 30 = oversold (may bounce up). Above 70 = overbought (may drop).
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white font-medium text-sm">Sharpe Ratio</p>
              <p className="text-gray-400/70 text-xs mt-1">
                Measures risk-adjusted return. Above 1 = good, above 2 = excellent.
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white font-medium text-sm">Volatility</p>
              <p className="text-gray-400/70 text-xs mt-1">
                Measures price fluctuation. High volatility = larger price swings (higher risk).
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white font-medium text-sm">VaR (Value at Risk)</p>
              <p className="text-gray-400/70 text-xs mt-1">
                Maximum expected loss in 95% of scenarios. Higher % = more downside risk.
              </p>
            </div>
          </div>
        </div>

        {/* Data Sources */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mt-6">
          <h2 className="text-xl font-light text-[#d8bb6b] mb-3">🔗 Data Sources</h2>
          <ul className="space-y-2 text-sm text-gray-400/70 list-disc pl-4">
            <li><span className="text-white/90">Yahoo Finance:</span> Real-time stock prices and historical data</li>
            <li><span className="text-white/90">Anthropic Claude:</span> AI-powered investment insights and recommendations</li>
            <li><span className="text-white/90">Historical Market Data:</span> 1 year of daily price data for accurate statistical analysis</li>
          </ul>
        </div>

        {/* Disclaimer */}
        <div className="bg-white/5 border border-yellow-500/20 rounded-xl p-6 mt-6">
          <h2 className="text-xl font-light text-yellow-400 mb-3">⚠️ Disclaimer</h2>
          <p className="text-gray-400/70 text-sm leading-relaxed">
            TrendSetter provides investment insights for educational and informational purposes only. 
            All investments carry risk, and past performance does not guarantee future results. 
            You should consult with a qualified financial advisor before making any investment decisions.
          </p>
        </div>
      </div>
    </div>
  )
}