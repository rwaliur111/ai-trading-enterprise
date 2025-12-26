import { NextRequest, NextResponse } from 'next/server';
import { MarketDataService } from '@/domains/market-data/services/market-data-service';
import { TradingService } from '@/application/services/trading-service';

// Remove the auth import and add this function
async function checkAuth() {
  // Simple auth check - implement proper auth later
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return { authenticated: true }; // Development mode
  }
  return { authenticated: false, error: 'Unauthorized' };
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await checkAuth();
    if (!authCheck.authenticated) {
      return NextResponse.json(
        { error: authCheck.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { symbol, quantity, side, type = 'market', timeInForce = 'day' } = body;

    if (!symbol || !quantity || !side) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, quantity, side' },
        { status: 400 }
      );
    }

    // Check current price
    const quotes = await MarketDataService.getQuotes([symbol]);
    if (!quotes || quotes.length === 0) {
      return NextResponse.json(
        { error: `Unable to get quote for ${symbol}` },
        { status: 400 }
      );
    }

    const currentPrice = quotes[0].last_price;
    
    // Execute trade (mock for now)
    const tradingService = new TradingService();
    
    // Mock order response since we're in development
    const mockOrder = {
      id: `order_${Date.now()}`,
      symbol,
      quantity: Number(quantity),
      side,
      type,
      status: 'filled',
      filled_avg_price: currentPrice,
      submitted_at: new Date().toISOString(),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      order: mockOrder,
      executedAt: new Date().toISOString(),
      estimatedValue: currentPrice * Number(quantity),
      message: 'Trade executed (demo mode)'
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
    const authCheck = await checkAuth();
    if (!authCheck.authenticated) {
      return NextResponse.json(
        { error: authCheck.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Mock orders for development
    const mockOrders = [
      {
        id: 'order_1',
        symbol: 'AAPL',
        side: 'buy',
        qty: 10,
        status: 'filled',
        filled_avg_price: 175.50,
        submitted_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'order_2',
        symbol: 'MSFT',
        side: 'sell',
        qty: 5,
        status: 'filled',
        filled_avg_price: 420.75,
        submitted_at: new Date(Date.now() - 172800000).toISOString()
      }
    ];

    return NextResponse.json({
      success: true,
      orders: mockOrders,
      timestamp: new Date().toISOString(),
      message: 'Demo mode - showing mock orders'
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