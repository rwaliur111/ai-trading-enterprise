import { NextRequest, NextResponse } from 'next/server'
import { AlpacaService } from '@/infrastructure/external-apis/alpaca-service'
import { SupabaseClient } from '@/infrastructure/database/supabase-client'
import { AIAgentOrchestrator } from '@/application/services/ai-agent-orchestrator'
import { MarketDataService } from '@/domains/market-data/services/market-data-service'
import { TRADING_CONFIG } from '@/config/constants'

// GET: Fetch orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const after = searchParams.get('after')
    const direction = searchParams.get('direction') || 'desc'

    const alpaca = new AlpacaService()
    const orders = await alpaca.getOrders(status as any, limit, after, undefined, direction as any)

    // Format orders
    const formattedOrders = orders.map((order: any) => ({
      id: order.id,
      client_order_id: order.client_order_id,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      quantity: parseFloat(order.qty),
      filled_quantity: parseFloat(order.filled_qty),
      filled_price: order.filled_avg_price ? parseFloat(order.filled_avg_price) : null,
      limit_price: order.limit_price ? parseFloat(order.limit_price) : null,
      stop_price: order.stop_price ? parseFloat(order.stop_price) : null,
      trail_percent: order.trail_percent ? parseFloat(order.trail_percent) : null,
      trail_price: order.trail_price ? parseFloat(order.trail_price) : null,
      status: order.status,
      time_in_force: order.time_in_force,
      created_at: order.created_at,
      updated_at: order.updated_at,
      filled_at: order.filled_at,
      canceled_at: order.canceled_at,
      failed_at: order.failed_at,
      expired_at: order.expired_at,
      replaced_at: order.replaced_at,
      extended_hours: order.extended_hours,
      legs: order.legs
    }))

    // Get additional metrics
    const totalOrders = formattedOrders.length
    const filledOrders = formattedOrders.filter(o => o.status === 'filled').length
    const pendingOrders = formattedOrders.filter(o => ['new', 'partially_filled', 'accepted'].includes(o.status)).length
    const canceledOrders = formattedOrders.filter(o => o.status === 'canceled').length

    return NextResponse.json({
      orders: formattedOrders,
      summary: {
        total: totalOrders,
        filled: filledOrders,
        pending: pendingOrders,
        canceled: canceledOrders,
        fill_rate: totalOrders > 0 ? (filledOrders / totalOrders) * 100 : 0
      },
      pagination: {
        limit,
        has_more: orders.length === limit,
        next_cursor: orders.length > 0 ? orders[orders.length - 1].id : null
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error fetching orders:', error)
    
    return NextResponse.json({
      error: 'Failed to fetch orders',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// POST: Place new order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      symbol,
      quantity,
      side,
      type = 'market',
      time_in_force = 'day',
      limit_price,
      stop_price,
      trail_percent,
      trail_price,
      extended_hours = false,
      client_order_id,
      ai_signal_id,
      strategy,
      risk_percentage
    } = body

    // Validate required fields
    if (!symbol || !quantity || !side) {
      return NextResponse.json({
        error: 'Missing required fields',
        required: ['symbol', 'quantity', 'side'],
        received: { symbol, quantity, side }
      }, { status: 400 })
    }

    // Validate quantity
    if (quantity <= 0) {
      return NextResponse.json({
        error: 'Quantity must be greater than 0',
        quantity
      }, { status: 400 })
    }

    // Validate side
    if (!['buy', 'sell'].includes(side.toLowerCase())) {
      return NextResponse.json({
        error: 'Invalid side. Must be "buy" or "sell"',
        side
      }, { status: 400 })
    }

    const alpaca = new AlpacaService()
    const marketDataService = new MarketDataService()
    const supabase = SupabaseClient.getInstance()
    const orchestrator = new AIAgentOrchestrator()

    // Get current market data for validation
    const [account, quote] = await Promise.all([
      alpaca.getAccount(),
      marketDataService.getRealTimeQuote(symbol).catch(() => null)
    ])

    // Risk checks for buy orders
    if (side.toLowerCase() === 'buy') {
      const buyingPower = parseFloat(account.buying_power?.toString() || '0')
      const estimatedCost = (quote?.price || 0) * quantity
      
      // Check buying power
      if (estimatedCost > buyingPower * 0.95) {
        return NextResponse.json({
          error: 'Insufficient buying power',
          buying_power: buyingPower,
          estimated_cost: estimatedCost,
          required_buffer: buyingPower * 0.05,
          available_for_trade: buyingPower * 0.95
        }, { status: 400 })
      }

      // Check position size limit
      if (estimatedCost > TRADING_CONFIG.MAX_POSITION_SIZE) {
        return NextResponse.json({
          error: 'Position size exceeds maximum limit',
          estimated_cost: estimatedCost,
          max_position_size: TRADING_CONFIG.MAX_POSITION_SIZE,
          exceeded_by: estimatedCost - TRADING_CONFIG.MAX_POSITION_SIZE
        }, { status: 400 })
      }

      // Check portfolio allocation
      const positions = await alpaca.getPositions()
      const totalPortfolioValue = parseFloat(account.portfolio_value?.toString() || '0')
      const currentPositionValue = positions
        .filter((p: any) => p.symbol === symbol)
        .reduce((sum: number, p: any) => sum + parseFloat(p.market_value || '0'), 0)
      
      const newPositionValue = currentPositionValue + estimatedCost
      const allocationPercent = (newPositionValue / totalPortfolioValue) * 100
      
      if (allocationPercent > TRADING_CONFIG.MAX_PORTFOLIO_ALLOCATION * 100) {
        return NextResponse.json({
          error: 'Would exceed maximum portfolio allocation',
          current_allocation: (currentPositionValue / totalPortfolioValue) * 100,
          new_allocation: allocationPercent,
          max_allocation: TRADING_CONFIG.MAX_PORTFOLIO_ALLOCATION * 100,
          max_additional: (TRADING_CONFIG.MAX_PORTFOLIO_ALLOCATION * totalPortfolioValue) - currentPositionValue
        }, { status: 400 })
      }
    }

    // Risk checks for sell orders
    if (side.toLowerCase() === 'sell') {
      const positions = await alpaca.getPositions()
      const position = positions.find((p: any) => p.symbol === symbol)
      
      if (!position || parseFloat(position.qty) < quantity) {
        return NextResponse.json({
          error: 'Insufficient shares to sell',
          symbol,
          requested: quantity,
          available: position ? parseFloat(position.qty) : 0,
          deficit: position ? quantity - parseFloat(position.qty) : quantity
        }, { status: 400 })
      }
    }

    // AI risk assessment if AI signal provided
    let riskAssessment = null
    if (ai_signal_id) {
      riskAssessment = await orchestrator.assessRisk(symbol, (quote?.price || 0) * quantity)
      
      if (riskAssessment.position_score < 0.3) {
        return NextResponse.json({
          warning: 'High risk detected by AI',
          risk_assessment: riskAssessment,
          recommendation: 'Consider reducing position size or using stop-loss',
          override_available: true
        }, { status: 200 })
      }
    }

    // Prepare order for Alpaca
    const orderParams: any = {
      symbol: symbol.toUpperCase(),
      qty: quantity,
      side: side.toLowerCase(),
      type: type.toLowerCase(),
      time_in_force,
      extended_hours
    }

    // Add optional parameters
    if (limit_price) orderParams.limit_price = limit_price
    if (stop_price) orderParams.stop_price = stop_price
    if (trail_percent) orderParams.trail_percent = trail_percent
    if (trail_price) orderParams.trail_price = trail_price
    if (client_order_id) orderParams.client_order_id = client_order_id

    console.log(`Placing ${side} order for ${quantity} shares of ${symbol}`)

    // Place the order
    const orderResult = await alpaca.placeOrder(orderParams)

    // Save to database for tracking
    try {
      const tradeRecord = {
        order_id: orderResult.id,
        client_order_id: orderResult.client_order_id || client_order_id,
        symbol: orderResult.symbol,
        side: orderResult.side,
        quantity: parseFloat(orderResult.qty),
        filled_quantity: parseFloat(orderResult.filled_qty),
        filled_price: orderResult.filled_avg_price ? parseFloat(orderResult.filled_avg_price) : null,
        order_type: orderResult.type,
        time_in_force: orderResult.time_in_force,
        limit_price: orderResult.limit_price ? parseFloat(orderResult.limit_price) : null,
        stop_price: orderResult.stop_price ? parseFloat(orderResult.stop_price) : null,
        status: orderResult.status,
        created_at: new Date(orderResult.created_at).toISOString(),
        updated_at: new Date(orderResult.updated_at).toISOString(),
        filled_at: orderResult.filled_at ? new Date(orderResult.filled_at).toISOString() : null,
        commission: TRADING_CONFIG.COMMISSION_PER_TRADE,
        ai_signal_id,
        strategy,
        risk_percentage,
        user_id: 'demo-user', // In production, get from auth
        risk_assessment: riskAssessment
      }

      await supabase.saveTrade(tradeRecord)
    } catch (dbError) {
      console.error('Error saving trade to database:', dbError)
      // Continue even if DB save fails
    }

    // Format response
    const response = {
      order: {
        id: orderResult.id,
        client_order_id: orderResult.client_order_id,
        symbol: orderResult.symbol,
        side: orderResult.side,
        type: orderResult.type,
        quantity: parseFloat(orderResult.qty),
        filled_quantity: parseFloat(orderResult.filled_qty),
        filled_price: orderResult.filled_avg_price ? parseFloat(orderResult.filled_avg_price) : null,
        limit_price: orderResult.limit_price ? parseFloat(orderResult.limit_price) : null,
        stop_price: orderResult.stop_price ? parseFloat(orderResult.stop_price) : null,
        status: orderResult.status,
        time_in_force: orderResult.time_in_force,
        created_at: orderResult.created_at,
        updated_at: orderResult.updated_at,
        filled_at: orderResult.filled_at,
        extended_hours: orderResult.extended_hours
      },
      cost_analysis: {
        estimated_cost: side.toLowerCase() === 'buy' 
          ? (orderResult.filled_avg_price ? parseFloat(orderResult.filled_avg_price) * quantity : null)
          : null,
        commission: TRADING_CONFIG.COMMISSION_PER_TRADE,
        total_cost: side.toLowerCase() === 'buy'
          ? (orderResult.filled_avg_price ? (parseFloat(orderResult.filled_avg_price) * quantity) + TRADING_CONFIG.COMMISSION_PER_TRADE : null)
          : TRADING_CONFIG.COMMISSION_PER_TRADE
      },
      risk_info: riskAssessment,
      metadata: {
        timestamp: new Date().toISOString(),
        paper_trading: TRADING_CONFIG.PAPER_TRADING,
        strategy_used: strategy || 'manual'
      }
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error: any) {
    console.error('Error placing order:', error)
    
    // Handle specific Alpaca errors
    if (error.message?.includes('insufficient buying power')) {
      return NextResponse.json({
        error: 'Insufficient buying power',
        details: error.message,
        suggestion: 'Reduce position size or add funds to account'
      }, { status: 400 })
    }
    
    if (error.message?.includes('insufficient position')) {
      return NextResponse.json({
        error: 'Insufficient shares',
        details: error.message,
        suggestion: 'Check your current position or reduce quantity'
      }, { status: 400 })
    }
    
    if (error.message?.includes('outside of market hours')) {
      return NextResponse.json({
        error: 'Outside market hours',
        details: error.message,
        suggestion: 'Enable extended hours trading or wait for market open'
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to place order',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// DELETE: Cancel order
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const order_id = searchParams.get('order_id')

    if (!order_id) {
      return NextResponse.json({
        error: 'Order ID is required',
        parameter: 'order_id'
      }, { status: 400 })
    }

    const alpaca = new AlpacaService()
    await alpaca.cancelOrder(order_id)

    return NextResponse.json({
      success: true,
      message: `Order ${order_id} cancelled successfully`,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error cancelling order:', error)
    
    if (error.message?.includes('order is already')) {
      return NextResponse.json({
        error: 'Order cannot be cancelled',
        details: error.message,
        current_status: 'already filled/canceled'
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to cancel order',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// PUT: Replace/update order
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { order_id, quantity, limit_price, stop_price, time_in_force } = body

    if (!order_id) {
      return NextResponse.json({
        error: 'Order ID is required'
      }, { status: 400 })
    }

    const alpaca = new AlpacaService()
    
    // First get the existing order
    const existingOrder = await alpaca.getOrder(order_id)
    
    if (!['new', 'partially_filled', 'accepted'].includes(existingOrder.status)) {
      return NextResponse.json({
        error: 'Order cannot be modified',
        current_status: existingOrder.status,
        allowed_statuses: ['new', 'partially_filled', 'accepted']
      }, { status: 400 })
    }

    // Cancel the existing order
    await alpaca.cancelOrder(order_id)

    // Create new order with updated parameters
    const newOrderParams: any = {
      symbol: existingOrder.symbol,
      qty: quantity || parseFloat(existingOrder.qty),
      side: existingOrder.side,
      type: existingOrder.type,
      time_in_force: time_in_force || existingOrder.time_in_force,
      extended_hours: existingOrder.extended_hours
    }

    if (limit_price) newOrderParams.limit_price = limit_price
    if (stop_price) newOrderParams.stop_price = stop_price
    if (existingOrder.trail_percent) newOrderParams.trail_percent = parseFloat(existingOrder.trail_percent)
    if (existingOrder.trail_price) newOrderParams.trail_price = parseFloat(existingOrder.trail_price)

    const newOrder = await alpaca.placeOrder(newOrderParams)

    return NextResponse.json({
      success: true,
      message: 'Order replaced successfully',
      original_order: order_id,
      new_order: newOrder.id,
      changes: {
        quantity: quantity ? { from: parseFloat(existingOrder.qty), to: quantity } : null,
        limit_price: limit_price ? { from: existingOrder.limit_price, to: limit_price } : null,
        stop_price: stop_price ? { from: existingOrder.stop_price, to: stop_price } : null,
        time_in_force: time_in_force ? { from: existingOrder.time_in_force, to: time_in_force } : null
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error replacing order:', error)
    
    return NextResponse.json({
      error: 'Failed to replace order',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}