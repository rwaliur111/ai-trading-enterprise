// Create src/interfaces/web/pages/api/trading/orders.ts
@'
import { NextApiRequest, NextApiResponse } from 'next'
import { AlpacaService } from '@/src/infrastructure/external-apis/alpaca-service'
import { supabase } from '@/src/infrastructure/database/supabase-client'
import { z } from 'zod'

const orderSchema = z.object({
  symbol: z.string().min(1).max(10),
  action: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive(),
  type: z.enum(['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT']),
  timeInForce: z.enum(['DAY', 'GTC', 'OPG', 'CLS', 'IOC', 'FOK']),
  limitPrice: z.number().positive().optional(),
  stopPrice: z.number().positive().optional()
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const orderData = orderSchema.parse(req.body)
    const alpacaService = new AlpacaService()

    // Map to Alpaca format
    const alpacaOrder = {
      symbol: orderData.symbol,
      qty: orderData.quantity,
      side: orderData.action.toLowerCase(),
      type: orderData.type.toLowerCase(),
      time_in_force: orderData.timeInForce.toLowerCase(),
      ...(orderData.limitPrice && { limit_price: orderData.limitPrice }),
      ...(orderData.stopPrice && { stop_price: orderData.stopPrice })
    }

    // Execute trade via Alpaca
    const result = await alpacaService.placeOrder(alpacaOrder)

    // Record trade in Supabase
    const { error: dbError } = await supabase
      .from('trades')
      .insert({
        symbol: orderData.symbol,
        action: orderData.action,
        quantity: orderData.quantity,
        price: result.filled_avg_price || 0,
        status: 'EXECUTED',
        executed_at: new Date().toISOString(),
        confidence_score: 0.8, // Default confidence
        alpaca_order_id: result.id
      })

    if (dbError) throw dbError

    res.status(200).json({
      success: true,
      data: result,
      message: `Trade executed: ${orderData.action} ${orderData.quantity} ${orderData.symbol}`
    })
  } catch (error: any) {
    console.error('Error executing trade:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to execute trade' 
    })
  }
}
'@ | Set-Content -Path ".\src\interfaces\web\pages\api\trading\orders.ts" -Encoding UTF8