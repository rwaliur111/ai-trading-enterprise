// Create src/interfaces/web/pages/api/trading/metrics.ts
@'
import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/src/infrastructure/database/supabase-client'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get today's date range
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    // Get today's trades
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())

    if (tradesError) throw tradesError

    // Calculate metrics
    const totalTrades = trades.length
    const winningTrades = trades.filter(trade => (trade.profit_loss || 0) > 0).length
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0
    
    // Calculate average confidence
    const avgConfidence = trades.length > 0 
      ? trades.reduce((sum, trade) => sum + (trade.confidence_score || 0), 0) / trades.length
      : 0

    const metrics = {
      confidence: avgConfidence,
      signalsToday: totalTrades,
      winRate,
      totalProfit: trades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0),
      averageProfit: totalTrades > 0 
        ? trades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0) / totalTrades
        : 0,
      bestTrade: trades.length > 0 
        ? Math.max(...trades.map(t => t.profit_loss || 0))
        : 0,
      worstTrade: trades.length > 0 
        ? Math.min(...trades.map(t => t.profit_loss || 0))
        : 0
    }

    res.status(200).json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error fetching trading metrics:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch trading metrics' 
    })
  }
}
'@ | Set-Content -Path ".\src\interfaces\web\pages\api\trading\metrics.ts" -Encoding UTF8