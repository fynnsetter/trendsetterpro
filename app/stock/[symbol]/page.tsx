'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Plot from 'react-plotly.js'
import AIInsight from '@/components/AIInsight'

interface StockData {
  ticker: string
  name: string
  currentPrice: number
  change: number
  changePercent: number
  high: number
  low: number
  volume: number
  pe: number
  marketCap: number
}

interface HistoryItem {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export default function StockPage() {
  const params = useParams()
  const router = useRouter()
  const symbol = params.symbol as string
  
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('1M')
  const [inWatchlist, setInWatchlist] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [PlotComponent, setPlotComponent] = useState<any>(null)
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick')

  const timeframes: Record<string, number> = {
    '1D': 1,
    '1W': 5,
    '1M': 21,
    '3M': 63,
    '1Y': 252,
    'ALL': 1260,
  }

  useEffect(() => {
    import('react-plotly.js').then((mod) => {
      setPlotComponent(() => mod.default)
    })
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const priceRes = await fetch(`/api/stock-price?symbol=${symbol}`)
        const priceData = await priceRes.json()
        
        const days = timeframes[timeframe] || 252
        const historyRes = await fetch(`/api/stock-price/history?symbol=${symbol}&days=${days}`)
        const historyData = await historyRes.json()
        
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        
        if (user) {
          const { data } = await supabase
            .from('watchlist')
            .select('*')
            .eq('user_id', user.id)
            .eq('ticker', symbol.toUpperCase())
          
          if (data !== null && data.length > 0) {
            setInWatchlist(true)
          }
        }

        setStockData({
          ticker: symbol.toUpperCase(),
          name: symbol.toUpperCase(),
          currentPrice: priceData.price || 0,
          change: priceData.change || 0,
          changePercent: priceData.changePercent || 0,
          high: priceData.dayHigh || 0,
          low: priceData.dayLow || 0,
          volume: priceData.volume || 0,
          pe: priceData.pe || 0,
          marketCap: 0,
        })

        if (historyData.prices && Array.isArray(historyData.prices)) {
          const ohlcData = historyData.prices.map((item: any) => ({
            date: item.date,
            open: item.open || item.close,
            high: item.high || item.close,
            low: item.low || item.close,
            close: item.close,
            volume: item.volume || 0,
          }))
          setHistory(ohlcData)
        }
      } catch (error) {
        console.error('Error fetching stock data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (symbol) {
      fetchData()
    }
  }, [symbol, timeframe])

  const addToWatchlist = async () => {
    if (!user) {
      alert('Please log in to add to watchlist')
      return
    }

    if (inWatchlist) {
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('ticker', symbol.toUpperCase())
      
      if (!error) setInWatchlist(false)
    } else {
      const { error } = await supabase
        .from('watchlist')
        .insert([{ user_id: user.id, ticker: symbol.toUpperCase() }])
      
      if (!error) setInWatchlist(true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a2332] flex items-center justify-center">
        <div className="text-white text-xl">Loading {symbol}...</div>
      </div>
    )
  }

  const closes = history.map(item => item.close)
  const dates = history.map(item => item.date)

  const getMA = (data: number[], period: number) => {
    const result: (number | null)[] = []
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null)
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
        result.push(sum / period)
      }
    }
    return result
  }

  const ma50 = getMA(closes, 50)
  const ma200 = getMA(closes, 200)

  const increaseColor = '#22c55e'
  const decreaseColor = '#ef4444'

  const chartData = chartType === 'candlestick' ? [
    {
      type: 'candlestick',
      x: dates,
      open: history.map(d => d.open),
      high: history.map(d => d.high),
      low: history.map(d => d.low),
      close: history.map(d => d.close),
      increasing: { line: { color: increaseColor } },
      decreasing: { line: { color: decreaseColor } },
      name: 'Price',
    },
    {
      type: 'scatter',
      mode: 'lines',
      name: 'MA 50',
      x: dates,
      y: ma50,
      line: { color: '#f59e0b', width: 1, dash: 'dash' },
      yaxis: 'y',
    },
    {
      type: 'scatter',
      mode: 'lines',
      name: 'MA 200',
      x: dates,
      y: ma200,
      line: { color: '#3b82f6', width: 1, dash: 'dash' },
      yaxis: 'y',
    },
  ] : [
    {
      type: 'scatter',
      mode: 'lines',
      name: 'Price',
      x: dates,
      y: closes,
      line: { color: '#d8bb6b', width: 2 },
    },
    {
      type: 'scatter',
      mode: 'lines',
      name: 'MA 50',
      x: dates,
      y: ma50,
      line: { color: '#f59e0b', width: 1, dash: 'dash' },
    },
    {
      type: 'scatter',
      mode: 'lines',
      name: 'MA 200',
      x: dates,
      y: ma200,
      line: { color: '#3b82f6', width: 1, dash: 'dash' },
    },
  ]

  return (
    <div className="min-h-screen bg-[#1a2332] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-light text-white">
              {symbol.toUpperCase()}
            </h1>
            <p className="text-gray-400/70 text-sm">
              {stockData?.name || symbol.toUpperCase()}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={addToWatchlist}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                inWatchlist
                  ? 'bg-[#d8bb6b]/20 text-[#d8bb6b] border border-[#d8bb6b]/30'
                  : 'bg-[#d8bb6b] text-[#1a2332] hover:bg-[#c4a45a]'
              }`}
            >
              {inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
            </button>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-all"
            >
              ← Back
            </button>
          </div>
        </div>

        <div className="mb-6">
          <span className="text-4xl font-bold text-white">
            £{stockData?.currentPrice?.toFixed(2) || '0.00'}
          </span>
          {stockData?.change !== 0 && (
            <span className={`ml-3 text-lg font-medium ${(stockData?.change || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(stockData?.change || 0) >= 0 ? '+' : ''}{stockData?.changePercent?.toFixed(2)}%
            </span>
          )}
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {Object.keys(timeframes).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                timeframe === tf
                  ? 'bg-[#d8bb6b] text-[#1a2332]'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setChartType('candlestick')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              chartType === 'candlestick'
                ? 'bg-[#d8bb6b] text-[#1a2332]'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Candlestick
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              chartType === 'line'
                ? 'bg-[#d8bb6b] text-[#1a2332]'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Line
          </button>
        </div>

        {PlotComponent && history.length > 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <div className="h-96">
              <PlotComponent
                data={chartData}
                layout={{
                  paper_bgcolor: 'rgba(0,0,0,0)',
                  plot_bgcolor: 'rgba(0,0,0,0)',
                  font: { color: '#9ca3af' },
                  margin: { l: 50, r: 20, t: 20, b: 30 },
                  showlegend: true,
                  legend: {
                    orientation: 'h',
                    y: 1.1,
                    x: 0.5,
                    xanchor: 'center',
                    font: { color: '#9ca3af', size: 10 },
                  },
                  xaxis: {
                    gridcolor: 'rgba(255,255,255,0.05)',
                    rangeslider: { visible: false },
                  },
                  yaxis: {
                    gridcolor: 'rgba(255,255,255,0.05)',
                    tickprefix: '£',
                  },
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 text-center">
            <p className="text-gray-400/70">No historical data available for {symbol}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-gray-400/70 text-xs uppercase tracking-wider">High</p>
            <p className="text-white text-lg font-medium">
              £{stockData?.high?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-gray-400/70 text-xs uppercase tracking-wider">Low</p>
            <p className="text-white text-lg font-medium">
              £{stockData?.low?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-gray-400/70 text-xs uppercase tracking-wider">Volume</p>
            <p className="text-white text-lg font-medium">
              {stockData?.volume?.toLocaleString() || '0'}
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-gray-400/70 text-xs uppercase tracking-wider">P/E</p>
            <p className="text-white text-lg font-medium">
              {/* 🔥 FIXED: Show P/E properly */}
              {stockData?.pe && stockData.pe > 0 ? stockData.pe.toFixed(2) : '—'}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <AIInsight ticker={symbol} />
        </div>
      </div>
    </div>
  )
}