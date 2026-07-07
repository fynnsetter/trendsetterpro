import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    let userId = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data, error } = await supabase.auth.getUser(token)
      if (!error && data.user) {
        userId = data.user.id
        console.log('✅ User authenticated:', userId)
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, holdings } = body

    if (!holdings || holdings.length === 0) {
      return NextResponse.json({ error: 'No holdings provided' }, { status: 400 })
    }

    console.log(`📊 Exporting ${holdings.length} holdings as ${type}`)

    // Get current prices for each holding
    const holdingsWithPrices = await Promise.all(
      holdings.map(async (holding: any) => {
        try {
          const priceRes = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${holding.ticker}`
          )
          const priceData = await priceRes.json()
          const currentPrice = priceData.chart.result[0]?.meta?.regularMarketPrice || holding.current_price || holding.avg_price
          return { ...holding, current_price: currentPrice }
        } catch (err) {
          return { ...holding, current_price: holding.current_price || holding.avg_price }
        }
      })
    )

    // ===== CSV EXPORT =====
    if (type === 'csv') {
      let csv = 'Ticker,Shares,Avg Price,Current Price,Total Value,P&L,Purchase Date\n'
      for (const h of holdingsWithPrices) {
        const total = h.shares * h.current_price
        const pnl = (h.current_price - h.avg_price) * h.shares
        csv += `${h.ticker},${h.shares},${h.avg_price.toFixed(2)},${h.current_price.toFixed(2)},${total.toFixed(2)},${pnl.toFixed(2)},${h.purchase_date}\n`
      }
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=portfolio-${new Date().toISOString().split('T')[0]}.csv`,
        },
      })
    }

    // ===== PDF EXPORT =====
    if (type === 'pdf') {
      try {
        const { jsPDF } = await import('jspdf')
        const { default: autoTable } = await import('jspdf-autotable')

        const doc = new jsPDF()
        doc.setFontSize(20)
        doc.setTextColor(216, 187, 107)
        doc.text('TrendSetter Portfolio Report', 14, 22)

        const totalValue = holdingsWithPrices.reduce((s: number, h: any) => s + h.shares * h.current_price, 0)
        const totalCost = holdingsWithPrices.reduce((s: number, h: any) => s + h.shares * h.avg_price, 0)
        const totalPnl = totalValue - totalCost

        doc.setFontSize(12)
        doc.setTextColor(200, 200, 200)
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 32)
        doc.text(`Total Value: £${totalValue.toFixed(2)}`, 14, 45)
        doc.text(`Total Cost: £${totalCost.toFixed(2)}`, 14, 53)
        doc.text(`Total P&L: £${totalPnl.toFixed(2)} (${totalCost > 0 ? ((totalPnl / totalCost) * 100).toFixed(2) : '0.00'}%)`, 14, 61)

        const tableData = holdingsWithPrices.map((h: any) => {
          const total = h.shares * h.current_price
          const pnl = (h.current_price - h.avg_price) * h.shares
          return [
            h.ticker,
            h.shares.toString(),
            `£${h.avg_price.toFixed(2)}`,
            `£${h.current_price.toFixed(2)}`,
            `£${total.toFixed(2)}`,
            `£${pnl.toFixed(2)}`,
            h.purchase_date,
          ]
        })

        autoTable(doc, {
          head: [['Ticker', 'Shares', 'Avg Price', 'Current', 'Total Value', 'P&L', 'Purchase Date']],
          body: tableData,
          startY: 70,
          styles: { fontSize: 9, textColor: [200, 200, 200] },
          headStyles: { fillColor: [26, 35, 50], textColor: [216, 187, 107] },
          alternateRowStyles: { fillColor: [30, 40, 55] },
        })

        const pdfBuffer = doc.output('arraybuffer')
        return new NextResponse(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=portfolio-${new Date().toISOString().split('T')[0]}.pdf`,
          },
        })
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError)
        return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}