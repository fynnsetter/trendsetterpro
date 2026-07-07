'use client'

import Link from 'next/link'

export default function TerminologyPage() {
  const terms = [
    {
      term: 'RSI (Relative Strength Index)',
      what: 'Measures momentum on a scale of 0-100.',
      good: 'Below 30 = Oversold (may bounce up). Above 70 = Overbought (may drop). 40-60 = Neutral.',
      color: 'text-yellow-400'
    },
    {
      term: 'MACD (Moving Average Convergence Divergence)',
      what: 'Shows the relationship between two moving averages.',
      good: 'Positive MACD = Bullish momentum. Negative MACD = Bearish momentum. The signal line crossing above = Buy signal.',
      color: 'text-blue-400'
    },
    {
      term: 'Moving Averages (MA50 & MA200)',
      what: 'Average price over the last 50 or 200 days.',
      good: 'Price above both = Uptrend. Price below both = Downtrend. MA50 above MA200 = Golden Cross (bullish).',
      color: 'text-purple-400'
    },
    {
      term: 'Bollinger Bands',
      what: 'Shows price volatility. Bands widen during high volatility, narrow during low.',
      good: 'Price touching lower band = Oversold (potential buy). Price touching upper band = Overbought (potential sell).',
      color: 'text-indigo-400'
    },
    {
      term: 'Volatility',
      what: 'How much a stock price moves up and down.',
      good: 'Low volatility (<20%) = Stable, less risky. High volatility (>35%) = Larger swings, more risky.',
      color: 'text-orange-400'
    },
    {
      term: 'Value at Risk (VaR)',
      what: 'The maximum loss you could expect in 95% of cases.',
      good: 'Low VaR (under 10%) = Limited downside. High VaR (over 20%) = Significant downside risk.',
      color: 'text-red-400'
    },
    {
      term: 'Probability of Profit',
      what: 'Chance that the stock will be higher than the current price in the given timeframe.',
      good: 'Over 60% = Good odds. 50-60% = Fair odds. Under 50% = Poor odds.',
      color: 'text-green-400'
    },
    {
      term: 'Expected Return',
      what: 'The average predicted return based on Monte Carlo simulations.',
      good: 'Positive = Stock is expected to go up. Negative = Stock is expected to go down.',
      color: 'text-teal-400'
    },
    {
      term: 'Support & Resistance',
      what: 'Support = Price level where the stock tends to stop falling. Resistance = Price level where it tends to stop rising.',
      good: 'Buy near support. Sell near resistance. A break above resistance = Bullish. A break below support = Bearish.',
      color: 'text-pink-400'
    },
    {
      term: 'Monte Carlo Simulation',
      what: 'Runs 10,000 possible future scenarios to show the range of likely outcomes.',
      good: 'Shows probability of profit, expected return, and worst/best case scenarios.',
      color: 'text-cyan-400'
    },
    {
      term: 'Beta',
      what: 'Measures how much a stock moves compared to the overall market.',
      good: 'Beta > 1 = Moves more than the market (higher risk/reward). Beta < 1 = Moves less than the market.',
      color: 'text-amber-400'
    },
    {
      term: 'Sharpe Ratio',
      what: 'Measures risk-adjusted return. How much return you get for each unit of risk.',
      good: 'Above 1.0 = Good. Above 2.0 = Excellent. Below 0 = Losing to the risk-free rate.',
      color: 'text-lime-400'
    }
  ]

  return (
    <div className="min-h-screen bg-[#1a2332] p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/dashboard" className="text-[#d8bb6b] hover:underline mb-6 inline-block">
          ← Back to Dashboard
        </Link>

        <h1 className="text-3xl font-light text-white mb-2">Investment Terminology Guide</h1>
        <p className="text-gray-400/70 mb-8">
          Understand the metrics we use to analyse stocks. Each term includes a simple explanation and what to look for.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {terms.map((term, index) => (
            <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-[#d8bb6b]/30 transition-all">
              <h3 className={`${term.color} font-bold text-sm uppercase tracking-wider mb-2`}>
                {term.term}
              </h3>
              <p className="text-gray-400 text-sm mb-2">{term.what}</p>
              <p className="text-white text-sm">
                <span className="text-gray-400">What's good:</span> {term.good}
              </p>
            </div>
          ))}
        </div>

        {/* Quick Reference Table */}
        <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-light text-white mb-4">Quick Reference: Good vs Bad</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <p className="text-green-400 font-bold">✅ Good</p>
              <ul className="text-gray-300 text-xs space-y-1 mt-1">
                <li>• RSI below 30 (oversold)</li>
                <li>• Volatility below 25%</li>
                <li>• Probability of profit over 60%</li>
                <li>• Price above MA50 & MA200</li>
                <li>• MACD positive</li>
                <li>• Sharpe Ratio above 1.0</li>
              </ul>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-yellow-400 font-bold">⚠️ Watch</p>
              <ul className="text-gray-300 text-xs space-y-1 mt-1">
                <li>• RSI 40-60 (neutral)</li>
                <li>• Volatility 25-35%</li>
                <li>• Probability of profit 40-60%</li>
                <li>• Price near MA50</li>
                <li>• MACD near zero</li>
              </ul>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 font-bold">❌ Bad</p>
              <ul className="text-gray-300 text-xs space-y-1 mt-1">
                <li>• RSI above 70 (overbought)</li>
                <li>• Volatility above 40%</li>
                <li>• Probability of profit under 40%</li>
                <li>• Price below MA50 & MA200</li>
                <li>• MACD negative</li>
                <li>• Sharpe Ratio below 0</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="mt-6 flex gap-4">
          <Link href="/about" className="text-gray-400 hover:text-white text-sm transition-all">
            📖 About the Methodology →
          </Link>
          <Link href="/dashboard/settings" className="text-gray-400 hover:text-white text-sm transition-all">
            ⚙️ Settings
          </Link>
        </div>
      </div>
    </div>
  )
}