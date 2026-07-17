import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, challengeId } = body

    if (!userId || !challengeId) {
      return NextResponse.json(
        { error: 'Missing userId or challengeId' },
        { status: 400 }
      )
    }

    // Fetch the challenge
    const { data: challenge, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .eq('user_id', userId)
      .single()

    if (error || !challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      )
    }

    // Fetch current portfolio value
    const { data: holdings } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)

    let currentValue = 0
    for (const holding of holdings || []) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://trendsetterpro.vercel.app'
      const priceRes = await fetch(`${baseUrl}/api/stock-price?symbol=${holding.ticker}`)
      const priceData = await priceRes.json()
      currentValue += holding.shares * (priceData.price || holding.avg_price)
    }

    const profit = currentValue - challenge.initial_amount
    const profitPercent = (profit / challenge.initial_amount) * 100

    const endDate = new Date(challenge.created_at)
    endDate.setMonth(endDate.getMonth() + challenge.timeframe_months)
    const isComplete = new Date() >= endDate

    return NextResponse.json({
      challenge,
      currentValue,
      profit,
      profitPercent,
      isComplete,
      targetReached: profitPercent >= challenge.target_return,
      daysRemaining: Math.max(0, Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))),
    })

  } catch (error) {
    console.error('Challenge tracker error:', error)
    return NextResponse.json(
      { error: 'Failed to track challenge' },
      { status: 500 }
    )
  }
}