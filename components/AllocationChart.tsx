'use client'

import { useState, useEffect } from 'react'

interface Holding {
  ticker: string
  shares: number
  avg_price: number
  current_price?: number
}

interface AllocationChartProps {
  holdings: Holding[]
}

export default function AllocationChart({ holdings }: AllocationChartProps) {
  const [PlotComponent, setPlotComponent] = useState<any>(null)

  useEffect(() => {
    import('react-plotly.js').then((mod) => {
      setPlotComponent(() => mod.default)
    })
  }, [])

  if (holdings.length === 0 || !PlotComponent) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="text-center py-8">
          <p className="text-gray-400/70">Add holdings to see your allocation.</p>
        </div>
      </div>
    )
  }

  // 🔥 Filter out holdings with 0 shares
  const validHoldings = holdings.filter(h => h.shares > 0)

  if (validHoldings.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="text-center py-8">
          <p className="text-gray-400/70">No holdings with shares.</p>
        </div>
      </div>
    )
  }

  const data = validHoldings.map(holding => {
    const price = holding.current_price || holding.avg_price
    return {
      ticker: holding.ticker,
      value: holding.shares * price,
    }
  })

  const total = data.reduce((sum, item) => sum + item.value, 0)

  // 🔥 If total is 0, show a message
  if (total === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="text-center py-8">
          <p className="text-gray-400/70">No allocation data available.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h3 className="text-sm font-light text-gray-400/70 mb-4">Holdings Allocation</h3>
      <div className="h-64">
        <PlotComponent
          data={[
            {
              type: 'pie',
              labels: data.map(d => `${d.ticker} (${((d.value / total) * 100).toFixed(1)}%)`),
              values: data.map(d => d.value),
              textinfo: 'label+percent',
              textposition: 'outside',
              marker: {
                colors: ['#d8bb6b', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6', '#22d3ee'],
              },
              hoverinfo: 'label+percent+value',
              hovertemplate: '%{label}<br>Value: £%{value:.2f}<br>%{percent}<extra></extra>',
            },
          ]}
          layout={{
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#9ca3af', size: 12 },
            margin: { l: 20, r: 20, t: 20, b: 20 },
            showlegend: false,
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  )
}