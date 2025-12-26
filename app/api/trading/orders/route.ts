import { NextRequest, NextResponse } from 'next/server';
import { MarketDataService } from '@/domains/market-data/services/market-data-service';
import { TradingService } from '@/application/services/trading-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, quantity, side, type = 'market', timeInForce = 'day' } = body;

    if (!symbol || !quantity || !side) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, quantity, side' },
        { status: 400 }
      );
    }

    const quotes = await MarketDataService.getQuotes([symbol]);
    if (!quotes || quotes.length === 0) {
      return NextResponse.json(
        { error: `Unable to get quote for ${symbol}` },
        { status: 400 }
      );
    }

    const currentPrice = quotes[0].last_price;
    
    const tradingService = new TradingService();
    const order = await tradingService.placeOrder({
      symbol,
      quantity: Number(quantity),
      side,
      type,
      timeInForce,
      limitPrice: type === 'limit' ? body.limitPrice : undefined,
      stopPrice: type === 'stop' ? body.stopPrice : undefined
    });

    return NextResponse.json({
      success: true,
      order,
      executedAt: new Date().toISOString(),
      estimatedValue: currentPrice * Number(quantity)
    });
  } catch (error) {
    console.error('Error placing order:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to place order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const tradingService = new TradingService();
    const orders = await tradingService.getOrders();

    return NextResponse.json({
      success: true,
      orders,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
