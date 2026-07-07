'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Select from 'react-select'

// Popular stocks for autocomplete
const POPULAR_STOCKS = [
  { value: 'AAPL', label: 'AAPL - Apple Inc.' },
  { value: 'MSFT', label: 'MSFT - Microsoft Corp.' },
  { value: 'GOOGL', label: 'GOOGL - Alphabet Inc.' },
  { value: 'AMZN', label: 'AMZN - Amazon.com Inc.' },
  { value: 'TSLA', label: 'TSLA - Tesla Inc.' },
  { value: 'NVDA', label: 'NVDA - NVIDIA Corp.' },
  { value: 'META', label: 'META - Meta Platforms' },
  { value: 'NFLX', label: 'NFLX - Netflix Inc.' },
  { value: 'JPM', label: 'JPM - JPMorgan Chase' },
  { value: 'VTI', label: 'VTI - Vanguard Total Stock Market' },
  { value: 'SPY', label: 'SPY - S&P 500 ETF' },
  { value: 'QQQ', label: 'QQQ - Nasdaq ETF' },
  { value: 'LLY', label: 'LLY - Eli Lilly & Co.' },
  { value: 'JNJ', label: 'JNJ - Johnson & Johnson' },
  { value: 'CAT', label: 'CAT - Caterpillar Inc.' },
  { value: 'GS', label: 'GS - Goldman Sachs' },
  { value: 'RTX', label: 'RTX - Raytheon Technologies' },
  { value: 'BABA', label: 'BABA - Alibaba Group' },
  { value: 'UBER', label: 'UBER - Uber Technologies' },
  { value: 'DIS', label: 'DIS - Walt Disney' },
]

interface StockOption {
  value: string
  label: string
}

export default function AddStock() {
  const [ticker, setTicker] = useState('')
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [shares, setShares] = useState('')
  const [amount, setAmount] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(false)
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [selectedOption, setSelectedOption] = useState<StockOption | null>(null)
  const [inputMode, setInputMode] = useState<'shares' | 'amount'>('shares')
  const router = useRouter()

  // Fetch price when ticker changes
  useEffect(() => {
    const fetchPrice = async () => {
      if (!ticker || ticker.length < 2) {
        setCurrentPrice(null)
        return
      }

      setFetchingPrice(true)
      setError('')

      try {
        const response = await fetch(`/api/stock-price?symbol=${ticker.toUpperCase()}`)
        const data = await response.json()

        if (response.ok && data.price) {
          setCurrentPrice(data.price)
          // If in amount mode and price is set, calculate shares
          if (inputMode === 'amount' && amount) {
            const numAmount = parseFloat(amount)
            if (!isNaN(numAmount) && numAmount > 0) {
              const calculatedShares = numAmount / data.price
              setShares(calculatedShares.toFixed(4))
            }
          }
        } else {
          setError('Could not fetch price. Please enter manually.')
        }
      } catch (err) {
        console.error('Error fetching price:', err)
        setError('Could not fetch price. Please enter manually.')
      } finally {
        setFetchingPrice(false)
      }
    }

    const timer = setTimeout(fetchPrice, 300)
    return () => clearTimeout(timer)
  }, [ticker, inputMode, amount])

  // When shares change, update amount
  useEffect(() => {
    if (inputMode === 'shares' && currentPrice && shares) {
      const numShares = parseFloat(shares)
      if (!isNaN(numShares) && numShares > 0) {
        const calculatedAmount = numShares * currentPrice
        setAmount(calculatedAmount.toFixed(2))
      }
    }
  }, [shares, currentPrice, inputMode])

  // When amount changes, update shares
  useEffect(() => {
    if (inputMode === 'amount' && currentPrice && amount) {
      const numAmount = parseFloat(amount)
      if (!isNaN(numAmount) && numAmount > 0) {
        const calculatedShares = numAmount / currentPrice
        setShares(calculatedShares.toFixed(4))
      }
    }
  }, [amount, currentPrice, inputMode])

  const handleSelectChange = (option: StockOption | null) => {
    setSelectedOption(option)
    if (option) {
      setTicker(option.value)
      // Reset share/amount fields
      setShares('')
      setAmount('')
    }
  }

  const handleSharesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMode('shares')
    setShares(e.target.value)
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMode('amount')
    setAmount(e.target.value)
  }

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    // Validate inputs
    const numShares = parseFloat(shares)
    if (isNaN(numShares) || numShares <= 0) {
      setError('Please enter a valid number of shares')
      setLoading(false)
      return
    }

    if (!currentPrice && ticker) {
      setError('Could not fetch current price. Please try again.')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in')
      setLoading(false)
      return
    }

    const totalCost = numShares * (currentPrice || 0)

    // 🔥 Check if this ticker already exists in the user's portfolio
    const { data: existingHoldings, error: fetchError } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', user.id)
      .eq('ticker', ticker.toUpperCase())

    if (fetchError) {
      console.error('Error checking existing holdings:', fetchError)
    }

    const existing = existingHoldings?.[0]

    // 🔥 Deduct from cash balance
    const { error: cashError } = await supabase
      .from('cash')
      .insert([
        {
          user_id: user.id,
          amount: -totalCost,
          type: 'withdrawal',
          description: `Bought ${ticker.toUpperCase()} (${numShares.toFixed(4)} shares at £${currentPrice?.toFixed(2)})`,
        },
      ])

    if (cashError) {
      console.error('Error deducting cash:', cashError)
      setError('Failed to deduct cash balance. Please check your cash balance.')
      setLoading(false)
      return
    }

    if (existing) {
      // 🔥 Update existing holding
      const totalShares = existing.shares + numShares
      const totalCostSum = (existing.shares * existing.avg_price) + (numShares * (currentPrice || 0))
      const newAvgPrice = totalCostSum / totalShares

      const { error } = await supabase
        .from('portfolios')
        .update({
          shares: totalShares,
          avg_price: newAvgPrice,
        })
        .eq('id', existing.id)

      if (error) {
        console.error('Error updating stock:', error)
        setError('Failed to update stock')
        setLoading(false)
        return
      }
    } else {
      // 🔥 Insert new holding
      const { error } = await supabase
        .from('portfolios')
        .insert([
          {
            user_id: user.id,
            ticker: ticker.toUpperCase(),
            shares: numShares,
            avg_price: currentPrice || 0,
            purchase_date: purchaseDate,
          },
        ])

      if (error) {
        console.error('Error adding stock:', error)
        setError(error.message)
        setLoading(false)
        return
      }
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/dashboard/overview'), 1500)
  }

  return (
    <div className="min-h-screen bg-[#1a2332] p-8">
      <div className="max-w-2xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-light text-white">
              Add <span className="text-[#d8bb6b] font-bold">Stock</span>
            </h1>
            <p className="text-gray-400/70 mt-1">Add a new holding to your portfolio</p>
          </div>
          <Link 
            href="/dashboard" 
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 hover:border-white/20 transition-all"
          >
            Back to Dashboard
          </Link>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-center">
            ✅ Stock added successfully! Redirecting...
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleAddStock} className="bg-white/5 border border-white/10 rounded-xl p-8">
          <div className="space-y-5">
            
            {/* Search Stock */}
            <div>
              <label className="block text-gray-200/70 font-light text-sm tracking-wide mb-1.5">Search Stock</label>
              <Select
                options={POPULAR_STOCKS}
                value={selectedOption}
                onChange={handleSelectChange}
                placeholder="Type to search for a stock..."
                className="text-black"
                styles={{
                  control: (base) => ({
                    ...base,
                    background: 'rgba(0,0,0,0.2)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '4px',
                    color: 'white',
                  }),
                  input: (base) => ({
                    ...base,
                    color: 'white',
                  }),
                  singleValue: (base) => ({
                    ...base,
                    color: 'white',
                  }),
                  menu: (base) => ({
                    ...base,
                    background: '#1a2332',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }),
                  option: (base, state) => ({
                    ...base,
                    background: state.isFocused ? 'rgba(216,187,107,0.2)' : 'transparent',
                    color: 'white',
                    '&:hover': {
                      background: 'rgba(216,187,107,0.1)',
                    },
                  }),
                }}
              />
            </div>

            {/* Or Enter Manually */}
            <div>
              <label className="block text-gray-200/70 font-light text-sm tracking-wide mb-1.5">Or Enter Ticker Manually</label>
              <input 
                type="text" 
                placeholder="AAPL, TSLA, NVDA..." 
                value={ticker}
                onChange={(e) => {
                  setTicker(e.target.value)
                  setSelectedOption(null)
                }}
                className="w-full px-5 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder:text-gray-400/40 
                transition-all duration-300 ease-out
                hover:scale-[1.02] hover:border-white/20
                focus:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#d8bb6b]/60 focus:border-[#d8bb6b]/40 focus:shadow-lg focus:shadow-[#d8bb6b]/10"
              />
              {fetchingPrice && (
                <p className="text-gray-400/50 text-sm mt-1">Fetching price...</p>
              )}
              {currentPrice && ticker && (
                <p className="text-green-400 text-sm mt-1">
                  Current price: £{currentPrice.toFixed(2)}
                </p>
              )}
            </div>

            {/* Shares / Amount Toggle */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-200/70 font-light text-sm tracking-wide mb-1.5">
                  Shares
                </label>
                <input 
                  type="number" 
                  placeholder="0.001" 
                  step="0.0001"
                  value={shares}
                  onChange={handleSharesChange}
                  className="w-full px-5 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder:text-gray-400/40 
                  focus:outline-none focus:ring-2 focus:ring-[#d8bb6b]/60"
                />
              </div>
              <div>
                <label className="block text-gray-200/70 font-light text-sm tracking-wide mb-1.5">
                  Amount (£)
                </label>
                <input 
                  type="number" 
                  placeholder="100.00" 
                  step="0.01"
                  value={amount}
                  onChange={handleAmountChange}
                  className="w-full px-5 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder:text-gray-400/40 
                  focus:outline-none focus:ring-2 focus:ring-[#d8bb6b]/60"
                />
              </div>
            </div>

            {/* Purchase Date */}
            <div>
              <label className="block text-gray-200/70 font-light text-sm tracking-wide mb-1.5">Purchase Date</label>
              <input 
                type="date" 
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-5 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder:text-gray-400/40 
                focus:outline-none focus:ring-2 focus:ring-[#d8bb6b]/60"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading || fetchingPrice || !currentPrice}
            className="w-full mt-8 bg-[#d8bb6b] text-[#1a2332] font-semibold py-3.5 rounded-xl hover:bg-[#c4a45a] transition-all duration-300 text-lg tracking-wide shadow-lg shadow-[#d8bb6b]/10 hover:shadow-[#d8bb6b]/20 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding Stock...' : 'Add to Portfolio'}
          </button>
        </form>
      </div>
    </div>
  )
}