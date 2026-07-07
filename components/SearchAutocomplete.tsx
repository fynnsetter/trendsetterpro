'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const POPULAR_STOCKS = [
  // Technology
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.' },
  { symbol: 'META', name: 'Meta Platforms' },
  { symbol: 'AMD', name: 'Advanced Micro Devices' },
  { symbol: 'INTC', name: 'Intel Corp.' },
  { symbol: 'IBM', name: 'IBM Corp.' },
  { symbol: 'ORCL', name: 'Oracle Corp.' },
  { symbol: 'CRM', name: 'Salesforce' },
  { symbol: 'ADBE', name: 'Adobe Inc.' },
  { symbol: 'SHOP', name: 'Shopify Inc.' },
  { symbol: 'SNOW', name: 'Snowflake Inc.' },
  { symbol: 'PLTR', name: 'Palantir Technologies' },
  { symbol: 'ASML', name: 'ASML Holding' },
  { symbol: 'SAP', name: 'SAP SE' },
  
  // Consumer
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'NFLX', name: 'Netflix Inc.' },
  { symbol: 'MCD', name: 'McDonald\'s Corp.' },
  { symbol: 'NKE', name: 'Nike Inc.' },
  { symbol: 'DIS', name: 'Walt Disney Co.' },
  { symbol: 'SBUX', name: 'Starbucks Corp.' },
  { symbol: 'COST', name: 'Costco Wholesale' },
  { symbol: 'WMT', name: 'Walmart Inc.' },
  { symbol: 'TGT', name: 'Target Corp.' },
  { symbol: 'PEP', name: 'PepsiCo Inc.' },
  { symbol: 'KO', name: 'Coca-Cola Co.' },
  { symbol: 'EL', name: 'Estée Lauder' },
  { symbol: 'PG', name: 'Procter & Gamble' },
  
  // Finance
  { symbol: 'JPM', name: 'JPMorgan Chase' },
  { symbol: 'V', name: 'Visa Inc.' },
  { symbol: 'MA', name: 'Mastercard Inc.' },
  { symbol: 'BAC', name: 'Bank of America' },
  { symbol: 'GS', name: 'Goldman Sachs' },
  { symbol: 'AXP', name: 'American Express' },
  { symbol: 'BLK', name: 'BlackRock Inc.' },
  { symbol: 'C', name: 'Citigroup Inc.' },
  { symbol: 'WFC', name: 'Wells Fargo' },
  { symbol: 'MS', name: 'Morgan Stanley' },
  { symbol: 'SCHW', name: 'Charles Schwab' },
  { symbol: 'COIN', name: 'Coinbase Global' },
  
  // Healthcare
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
  { symbol: 'PFE', name: 'Pfizer Inc.' },
  { symbol: 'MRK', name: 'Merck & Co.' },
  { symbol: 'ABBV', name: 'AbbVie Inc.' },
  { symbol: 'UNH', name: 'UnitedHealth Group' },
  { symbol: 'LLY', name: 'Eli Lilly & Co.' },
  { symbol: 'NVO', name: 'Novo Nordisk' },
  { symbol: 'GSK', name: 'GSK plc' },
  { symbol: 'AZN', name: 'AstraZeneca' },
  { symbol: 'MRNA', name: 'Moderna Inc.' },
  { symbol: 'BIIB', name: 'Biogen Inc.' },
  { symbol: 'AMGN', name: 'Amgen Inc.' },
  
  // Energy
  { symbol: 'XOM', name: 'Exxon Mobil' },
  { symbol: 'CVX', name: 'Chevron Corp.' },
  { symbol: 'BP', name: 'BP plc' },
  { symbol: 'SHEL', name: 'Shell plc' },
  { symbol: 'SLB', name: 'Schlumberger' },
  { symbol: 'EOG', name: 'EOG Resources' },
  { symbol: 'COP', name: 'ConocoPhillips' },
  { symbol: 'OXY', name: 'Occidental Petroleum' },
  
  // Industrial & Aerospace
  { symbol: 'LMT', name: 'Lockheed Martin' },
  { symbol: 'RTX', name: 'Raytheon Technologies' },
  { symbol: 'GE', name: 'General Electric' },
  { symbol: 'BA', name: 'Boeing Co.' },
  { symbol: 'CAT', name: 'Caterpillar Inc.' },
  { symbol: 'HON', name: 'Honeywell International' },
  { symbol: 'GD', name: 'General Dynamics' },
  { symbol: 'NOC', name: 'Northrop Grumman' },
  { symbol: 'UPS', name: 'United Parcel Service' },
  { symbol: 'FDX', name: 'FedEx Corp.' },
  { symbol: 'DE', name: 'Deere & Co.' },
  { symbol: 'CARR', name: 'Carrier Global' },
  
  // Auto
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'F', name: 'Ford Motor Co.' },
  { symbol: 'GM', name: 'General Motors' },
  { symbol: 'RIVN', name: 'Rivian Automotive' },
  { symbol: 'LCID', name: 'Lucid Group' },
  
  // Communication
  { symbol: 'T', name: 'AT&T Inc.' },
  { symbol: 'VZ', name: 'Verizon Communications' },
  { symbol: 'TMUS', name: 'T-Mobile US' },
  { symbol: 'CHTR', name: 'Charter Communications' },
  
  // Real Estate (REITs)
  { symbol: 'VNQ', name: 'Vanguard Real Estate ETF' },
  { symbol: 'O', name: 'Realty Income Corp.' },
  { symbol: 'SPG', name: 'Simon Property Group' },
  { symbol: 'PLD', name: 'Prologis Inc.' },
  { symbol: 'PSA', name: 'Public Storage' },
  { symbol: 'WELL', name: 'Welltower Inc.' },
  { symbol: 'AVB', name: 'AvalonBay Communities' },
  
  // ETFs
  { symbol: 'SPY', name: 'S&P 500 ETF' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market' },
  { symbol: 'VOO', name: 'Vanguard S&P 500' },
  { symbol: 'IWM', name: 'Russell 2000 ETF' },
  { symbol: 'VT', name: 'Vanguard Total World Stock' },
  { symbol: 'BND', name: 'Vanguard Total Bond Market' },
  { symbol: 'AGG', name: 'iShares Core U.S. Aggregate Bond' },
  
  // Commodities
  { symbol: 'GLD', name: 'Gold ETF' },
  { symbol: 'SLV', name: 'Silver ETF' },
  { symbol: 'USO', name: 'United States Oil Fund' },
  { symbol: 'DBC', name: 'Invesco Commodity Index' },
  { symbol: 'PPLT', name: 'Platinum ETF' },
]

interface SearchAutocompleteProps {
  onSelect?: (symbol: string) => void
}

export default function SearchAutocomplete({ onSelect }: SearchAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<typeof POPULAR_STOCKS>([])
  const [showResults, setShowResults] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (query.length > 0) {
      const filtered = POPULAR_STOCKS.filter(
        stock => 
          stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
          stock.name.toLowerCase().includes(query.toLowerCase())
      )
      setResults(filtered.slice(0, 8))
      setShowResults(true)
    } else {
      setResults([])
      setShowResults(false)
    }
  }, [query])

  const handleSelect = (symbol: string) => {
    setQuery(symbol)
    setShowResults(false)
    if (onSelect) onSelect(symbol)
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        placeholder="Search stocks (e.g., AAPL, Tesla)..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length > 0 && setShowResults(true)}
        className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder:text-gray-400/40 
        focus:outline-none focus:ring-2 focus:ring-[#d8bb6b]/60"
      />
      
      {showResults && results.length > 0 && (
        <div className="absolute z-20 w-full mt-2 bg-[#1a2332] border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-64 overflow-y-auto">
          {results.map((stock) => (
            <Link
              key={stock.symbol}
              href={`/stock/${stock.symbol}`}
              onClick={() => handleSelect(stock.symbol)}
              className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-all border-b border-white/5 last:border-0"
            >
              <div>
                <span className="text-white font-medium">{stock.symbol}</span>
                <span className="text-gray-400/70 text-sm ml-3">{stock.name}</span>
              </div>
              <span className="text-gray-400/50 text-sm">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}