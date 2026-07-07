import { NextRequest, NextResponse } from 'next/server'

// 🚀 EXPANDED STOCK UNIVERSE - 300+ stocks across all sectors
const STOCK_UNIVERSE = [
  // ===== MEGA CAPS =====
  'AAPL', 'MSFT', 'GOOGL', 'NVDA', 'AMZN', 'META', 'TSLA', 'BRK.B', 'LLY', 'JPM',
  'VTI', 'UNH', 'XOM', 'V', 'PG', 'JNJ', 'HD', 'MA', 'ABBV', 'COST',
  'CVX', 'MRK', 'PEP', 'WMT', 'KO', 'MCD', 'NKE', 'DIS', 'ADBE', 'CRM',
  'TMO', 'BAC', 'AMD', 'CAT', 'GS', 'RTX', 'HON', 'UBER', 'NEE', 'TXN',
  'QCOM', 'AMAT', 'LRCX', 'MU', 'AVGO', 'NOW', 'SNOW', 'PLTR', 'SHOP', 'ASML',
  'SAP', 'IBM', 'ORCL', 'INTC', 'CSCO', 'PANW', 'CRWD', 'ZS', 'DDOG', 'TEAM',
  'WDAY', 'ADSK', 'CDNS', 'SNPS', 'MDB', 'HUBS', 'OKTA', 'NET', 'FTNT', 'VRSN',

  // ===== TECHNOLOGY =====
  'AVGO', 'TXN', 'NXPI', 'ADI', 'MCHP', 'MRVL', 'MPWR', 'ON', 'STM', 'SWKS',
  'QRVO', 'LSCC', 'SLAB', 'POWI', 'DIOD', 'MSCC', 'CRUS', 'NXPI', 'MXL', 'SIMO',
  'APP', 'PATH', 'U', 'PINS', 'SNAP', 'RBLX', 'UPST', 'AFRM', 'SOFI', 'HOOD',
  'DKNG', 'DASH', 'LYFT', 'ABNB', 'GO', 'DOCU', 'TWLO', 'MSTR', 'S', 'BILL',
  'CFLT', 'GTLB', 'HCP', 'MNDY', 'SMAR', 'SPT', 'YEXT', 'ZETA', 'NRDY', 'MTTR',

  // ===== CONSUMER =====
  'HD', 'LOW', 'TGT', 'WMT', 'COST', 'TJX', 'ROST', 'DG', 'DLTR', 'ULTA',
  'MCD', 'YUM', 'DPZ', 'CMG', 'SBUX', 'NFLX', 'RBLX', 'DRI', 'CAKE', 'TXRH',
  'NKE', 'LULU', 'UAA', 'LEVI', 'PVH', 'VFC', 'TPR', 'RL', 'KTB', 'GIL',
  'PG', 'KO', 'PEP', 'MO', 'PM', 'BF.B', 'STZ', 'TAP', 'SAM', 'MNST',
  'KHC', 'GIS', 'CPB', 'CAG', 'SJM', 'HSY', 'MDLZ', 'MKC', 'EL', 'REV',

  // ===== FINANCE =====
  'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'SCHW', 'COIN', 'SQ', 'PYPL',
  'V', 'MA', 'AXP', 'DFS', 'SYF', 'ALL', 'AIG', 'MET', 'PRU', 'HIG',
  'BLK', 'KKR', 'APO', 'BX', 'TROW', 'STT', 'NTRS', 'BK', 'IVZ', 'BEN',
  'FIS', 'FISV', 'GPN', 'FOUR', 'FLT', 'TSS', 'HST', 'MAR', 'HLT', 'CHH',
  'FTV', 'IOT', 'VRT', 'WAB', 'IR', 'ETN', 'PH', 'AME', 'APTV', 'DOV',

  // ===== HEALTHCARE =====
  'JNJ', 'UNH', 'LLY', 'MRK', 'PFE', 'ABBV', 'TMO', 'ABT', 'ISRG', 'DHR',
  'CVS', 'CI', 'CNC', 'HCA', 'UHS', 'MOH', 'MRNA', 'BIIB', 'AMGN', 'GILD',
  'VRTX', 'REGN', 'ALNY', 'ILMN', 'DXCM', 'TMDX', 'MASI', 'MDT', 'BDX', 'EW',
  'GEHC', 'RMD', 'ZBH', 'SNY', 'GSK', 'AZN', 'NVO', 'BMY', 'TAK', 'BAX',
  'HOLX', 'BAX', 'WST', 'SWAV', 'IRTC', 'NVRO', 'PEN', 'SYK', 'ZIMV', 'ATEC',

  // ===== ENERGY =====
  'XOM', 'CVX', 'SHEL', 'BP', 'TTE', 'COP', 'EOG', 'SLB', 'HAL', 'BKR',
  'OXY', 'FANG', 'PXD', 'DVN', 'CTRA', 'EQT', 'LNG', 'TRGP', 'WMB', 'KMI',
  'OKE', 'KBR', 'CHX', 'VTOL', 'HP', 'LBRT', 'NOV', 'PTEN', 'RIG', 'DO',
  'FRO', 'TNK', 'EURN', 'DHT', 'SFL', 'GOGL', 'KOS', 'MUR', 'OGS', 'SWN',

  // ===== INDUSTRIAL =====
  'LMT', 'RTX', 'GE', 'BA', 'CAT', 'HON', 'GD', 'NOC', 'UPS', 'FDX',
  'DE', 'CARR', 'MMM', 'ETN', 'EMR', 'DOW', 'DHR', 'JCI', 'TT', 'AME',
  'CMI', 'DOV', 'PWR', 'JELD', 'TREX', 'BLDR', 'OC', 'LPX', 'BCC', 'BXC',
  'MSM', 'FAST', 'GWW', 'TEX', 'AGCO', 'MTW', 'TWI', 'HEES', 'HRI', 'URI',

  // ===== AUTO =====
  'TSLA', 'F', 'GM', 'RIVN', 'LCID', 'STLA', 'VWAGY', 'TM', 'HMC', 'DDAIF',
  'FSS', 'ALV', 'LEA', 'ADNT', 'BWA', 'DORM', 'FOXF', 'MPC', 'SMP', 'LKQ',

  // ===== AEROSPACE & DEFENSE =====
  'LMT', 'RTX', 'BA', 'GD', 'NOC', 'LHX', 'TXT', 'TDG', 'HII', 'KBR',
  'SAIC', 'KDP', 'MOG', 'GE', 'CW', 'FLIR', 'HXL', 'SPR', 'AAL', 'DAL',

  // ===== REAL ESTATE (REITs) =====
  'VNQ', 'O', 'SPG', 'PLD', 'PSA', 'WELL', 'AVB', 'EQR', 'INVH', 'ESS',
  'MAA', 'UDR', 'CPT', 'PCH', 'LXP', 'FRT', 'REG', 'KRC', 'SLG', 'VNO',
  'BXP', 'ARE', 'CUZ', 'HIW', 'JLL', 'CBRE', 'CWK', 'CUSH', 'REXR', 'STAG',

  // ===== ETFS =====
  'SPY', 'QQQ', 'VTI', 'VOO', 'IWM', 'VT', 'BND', 'AGG', 'TLT', 'GLD',
  'SLV', 'USO', 'DBC', 'PPLT', 'UGA', 'XLE', 'XLF', 'XLV', 'XLK', 'XLY',

  // ===== COMMODITIES =====
  'GLD', 'SLV', 'USO', 'DBC', 'PPLT', 'UGA', 'UNG', 'WEAT', 'CORN', 'SOYB',

  // ===== INTERNATIONAL =====
  'ASML', 'SAP', 'NVO', 'SNY', 'GSK', 'AZN', 'STLA', 'TM', 'HMC', 'VWAGY',
  'BABA', 'JD', 'BIDU', 'TCEHY', 'NIO', 'XPEV', 'LI', 'BYDDF', 'DEO', 'UL',
]

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '100')
  const sector = searchParams.get('sector') || 'all'
  const exclude = searchParams.get('exclude') || ''

  try {
    // In a real app, this would be stored in Supabase
    // For now, we fetch and cache from Yahoo
    const stocks = await Promise.all(
      STOCK_UNIVERSE.slice(0, Math.min(limit, STOCK_UNIVERSE.length)).map(async (ticker) => {
        try {
          const priceRes = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`
          )
          
          if (!priceRes.ok) return null
          
          const priceData = await priceRes.json()
          const result = priceData.chart.result[0]
          if (!result) return null
          
          const quote = result?.indicators?.quote[0] || {}
          const prices = quote.close || []
          const validPrices = prices.filter((p: number | null) => p !== null)
          
          if (validPrices.length < 50) return null

          const currentPrice = validPrices[validPrices.length - 1]
          const returns = []
          for (let i = 1; i < validPrices.length; i++) {
            returns.push((validPrices[i] - validPrices[i-1]) / validPrices[i-1])
          }
          
          const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length
          const variance = returns.reduce((a, b) => a + (b - meanReturn) ** 2, 0) / returns.length
          const volatility = Math.sqrt(variance) * Math.sqrt(252)
          const annualizedReturn = Math.min(Math.max(meanReturn * 252 * 100, -20), 50)

          // Calculate Sharpe ratio (assuming 3% risk-free rate)
          const riskFreeRate = 3
          const sharpeRatio = (annualizedReturn - riskFreeRate) / (Math.min(volatility * 100, 80) || 1)

          // Determine sector
          const tech = ['AAPL','MSFT','GOOGL','NVDA','META','AMD','INTC','IBM','ORCL','CRM','ADBE','SHOP','SNOW','PLTR','ASML','SAP']
          const consumer = ['AMZN','NFLX','MCD','NKE','DIS','SBUX','COST','WMT','TGT','PEP','KO','EL','PG','UL','DEO']
          const finance = ['JPM','V','MA','BAC','GS','AXP','BLK','C','WFC','MS','SCHW','COIN']
          const healthcare = ['JNJ','PFE','MRK','ABBV','UNH','LLY','NVO','GSK','AZN','MRNA','BIIB','AMGN']
          const energy = ['XOM','CVX','BP','SHEL','SLB','EOG','COP','OXY']
          const industrial = ['LMT','RTX','GE','BA','CAT','HON','GD','NOC','UPS','FDX','DE','CARR']
          const auto = ['TSLA','F','GM','RIVN','LCID']
          const reit = ['VNQ','O','SPG','PLD','PSA','WELL','AVB']
          const etfs = ['SPY','QQQ','VTI','VOO','IWM','VT','BND','AGG']
          const commodities = ['GLD','SLV','USO','DBC','PPLT','UGA']
          const international = ['ASML','SAP','NVO','SNY','GSK','AZN','STLA','TM','HMC','VWAGY','BABA','JD','BIDU','TCEHY','NIO','XPEV','LI','BYDDF','DEO','UL']
          
          let sectorName = 'Other'
          if (tech.includes(ticker)) sectorName = 'Technology'
          else if (consumer.includes(ticker)) sectorName = 'Consumer'
          else if (finance.includes(ticker)) sectorName = 'Finance'
          else if (healthcare.includes(ticker)) sectorName = 'Healthcare'
          else if (energy.includes(ticker)) sectorName = 'Energy'
          else if (industrial.includes(ticker)) sectorName = 'Industrial'
          else if (auto.includes(ticker)) sectorName = 'Auto'
          else if (reit.includes(ticker)) sectorName = 'Real Estate'

          let assetClass = 'equity'
          if (etfs.includes(ticker)) assetClass = 'etf'
          else if (commodities.includes(ticker)) assetClass = 'commodity'
          else if (reit.includes(ticker)) assetClass = 'reit'
          else if (international.includes(ticker)) assetClass = 'international'

          return {
            ticker,
            currentPrice,
            expectedReturn: annualizedReturn,
            volatility: Math.min(volatility * 100, 80),
            sector: sectorName,
            assetClass,
            sharpeRatio,
            score: 0,
          }
        } catch (error) {
          return null
        }
      })
    )

    const validStocks = stocks.filter(s => s !== null) as {
      ticker: string
      currentPrice: number
      expectedReturn: number
      volatility: number
      sector: string
      assetClass: string
      sharpeRatio: number
      score: number
    }[]

    if (validStocks.length === 0) {
      return NextResponse.json(
        { error: 'No stocks found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      stocks: validStocks,
      total: validStocks.length
    })

  } catch (error) {
    console.error('Stock database error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stocks' },
      { status: 500 }
    )
  }
}