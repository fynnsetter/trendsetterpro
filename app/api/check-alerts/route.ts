import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get all untriggered alerts
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('triggered', false)

    if (error) {
      console.error('Error fetching alerts:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const triggeredAlerts = []

    for (const alert of alerts || []) {
      // Fetch current price
      const priceRes = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${alert.ticker}`
      )
      const priceData = await priceRes.json()
      const currentPrice = priceData.chart.result[0]?.meta?.regularMarketPrice

      if (!currentPrice) continue

      let triggered = false
      if (alert.condition === 'above' && currentPrice >= alert.target_price) {
        triggered = true
      } else if (alert.condition === 'below' && currentPrice <= alert.target_price) {
        triggered = true
      }

      if (triggered) {
        // Mark alert as triggered
        await supabase
          .from('alerts')
          .update({ triggered: true, last_checked: new Date().toISOString() })
          .eq('id', alert.id)

        // 🔥 CREATE NOTIFICATION
        const message = `${alert.ticker} is now ${alert.condition} £${alert.target_price.toFixed(2)} (current: £${currentPrice.toFixed(2)})`
        
        await supabase
          .from('notifications')
          .insert([
            {
              user_id: alert.user_id,
              ticker: alert.ticker,
              message: message,
              read: false,
              triggered_at: new Date().toISOString(),
            },
          ])

        triggeredAlerts.push({
          ticker: alert.ticker,
          target_price: alert.target_price,
          condition: alert.condition,
          current_price: currentPrice,
        })
      }
    }

    return NextResponse.json({
      checked: alerts?.length || 0,
      triggered: triggeredAlerts.length,
      alerts: triggeredAlerts,
    })
  } catch (error) {
    console.error('Alert check error:', error)
    return NextResponse.json({ error: 'Failed to check alerts' }, { status: 500 })
  }
}