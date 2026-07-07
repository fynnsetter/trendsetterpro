'use client'

import { useEffect, useState } from 'react'

interface Holding {
  id: string
  ticker: string
  shares: number
  avg_price: number
  purchase_date: string
}

interface PortfolioChartProps {
  holdings: Holding[]
}

export default function PortfolioChart({ holdings }: PortfolioChartProps) {
  const [chartData, setChartData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [PlotComponent, setPlotComponent] = useState<any>(null)
  const [showPnL, setShowPnL] = useState(false)

  useEffect(() => {
    import('react-plotly.js').then((mod) => {
      setPlotComponent(() => mod.default)
    })
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      if (holdings.length === 0) {
        setLoading(false)
        return
      }

      try {
        const earliestDate = holdings.reduce((earliest, h) => {
          return h.purchase_date < earliest ? h.purchase_date : earliest
        }, holdings[0]?.purchase_date || new Date().toISOString().split('T')[0])

        const startDate = new Date(earliestDate)
        startDate.setDate(startDate.getDate() - 5)

        const endDate = new Date()
        
        const allDates: string[] = []
        const currentDate = new Date(startDate)
        while (currentDate <= endDate) {
          const dayOfWeek = currentDate.getDay()
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            allDates.push(new Date(currentDate).toISOString().split('T')[0])
          }
          currentDate.setDate(currentDate.getDate() + 1)
        }

        const portfolioValues: { [date: string]: number } = {}
        const totalCosts: { [date: string]: number } = {}

        allDates.forEach(date => {
          portfolioValues[date] = 0
          totalCosts[date] = 0
        })

        let hasHistoricalData = false

        for (const holding of holdings) {
          const purchaseDate = new Date(holding.purchase_date)
          const daysSincePurchase = Math.ceil((new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24))
          const daysToFetch = Math.max(daysSincePurchase + 10, 30)

          const response = await fetch(
            `/api/stock-price/history?symbol=${holding.ticker}&days=${daysToFetch}`
          )
          const data = await response.json()
          
          if (data.prices && Array.isArray(data.prices) && data.prices.length > 0) {
            hasHistoricalData = true
            const priceMap: { [date: string]: number } = {}
            data.prices.forEach((item: any) => {
              priceMap[item.date] = item.close
            })

            allDates.forEach(date => {
              const dateObj = new Date(date)
              const purchaseDateObj = new Date(holding.purchase_date)
              
              if (dateObj >= purchaseDateObj) {
                let price = priceMap[date]
                if (!price) {
                  const availableDates = Object.keys(priceMap).filter(d => d <= date)
                  if (availableDates.length > 0) {
                    price = priceMap[availableDates[availableDates.length - 1]]
                  }
                }
                if (price) {
                  portfolioValues[date] = (portfolioValues[date] || 0) + (price * holding.shares)
                  totalCosts[date] = (totalCosts[date] || 0) + (holding.avg_price * holding.shares)
                }
              }
            })
          }
        }

        // If no historical data, use purchase price as starting point
        if (!hasHistoricalData) {
          console.log('No historical data found, using purchase price as baseline')
          allDates.forEach(date => {
            const dateObj = new Date(date)
            holdings.forEach(holding => {
              const purchaseDateObj = new Date(holding.purchase_date)
              if (dateObj >= purchaseDateObj) {
                portfolioValues[date] = (portfolioValues[date] || 0) + (holding.avg_price * holding.shares)
                totalCosts[date] = (totalCosts[date] || 0) + (holding.avg_price * holding.shares)
              }
            })
          })
        }

        const dates = Object.keys(portfolioValues).filter(date => portfolioValues[date] > 0)
        const values = dates.map(date => portfolioValues[date])
        const costs = dates.map(date => totalCosts[date] || values[0])
        const pnl = dates.map((date, i) => values[i] - costs[i])

        // Ensure we have at least 2 data points for a line
        if (dates.length === 1) {
          // Add a dummy second point at the same value
          const today = new Date().toISOString().split('T')[0]
          if (dates[0] !== today) {
            dates.push(today)
            values.push(values[0])
            costs.push(costs[0])
            pnl.push(pnl[0])
          }
        }

        setChartData({
          dates,
          values,
          costs,
          pnl,
        })
      } catch (error) {
        console.error('Error fetching chart data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [holdings])

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-400/70">Loading chart...</div>
        </div>
      </div>
    )
  }

  if (!chartData || chartData.values.length === 0 || !PlotComponent) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="text-center py-8">
          <p className="text-gray-400/70">Add holdings to see your portfolio performance.</p>
        </div>
      </div>
    )
  }

  // Ensure we have at least 2 points for a line
  const dates = chartData.dates
  const values = chartData.values
  const pnl = chartData.pnl

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-light text-gray-400/70">Portfolio Performance</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPnL(!showPnL)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              showPnL
                ? 'bg-[#d8bb6b] text-[#1a2332]'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {showPnL ? 'Show Value' : 'Show P&L'}
          </button>
        </div>
      </div>
      <div className="h-64">
        <PlotComponent
          data={[
            {
              type: 'scatter',
              mode: 'lines+markers',
              name: showPnL ? 'P&L' : 'Portfolio Value',
              x: dates,
              y: showPnL ? pnl : values,
              line: { 
                color: showPnL 
                  ? (pnl[pnl.length - 1] >= 0 ? '#22c55e' : '#ef4444') 
                  : '#d8bb6b', 
                width: 2 
              },
              fill: showPnL ? 'tozeroy' : 'tozeroy',
              fillcolor: showPnL 
                ? (pnl[pnl.length - 1] >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)')
                : 'rgba(216, 187, 107, 0.1)',
              marker: {
                color: showPnL 
                  ? (pnl[pnl.length - 1] >= 0 ? '#22c55e' : '#ef4444') 
                  : '#d8bb6b',
                size: 4,
              },
            },
          ]}
          layout={{
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#9ca3af' },
            margin: { l: 50, r: 20, t: 20, b: 30 },
            showlegend: false,
            xaxis: {
              gridcolor: 'rgba(255,255,255,0.05)',
              tickformat: '%b %d',
              showticklabels: true,
              range: [dates[0], dates[dates.length - 1]],
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
  )
}