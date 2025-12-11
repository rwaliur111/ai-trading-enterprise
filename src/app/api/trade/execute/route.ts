import { NextRequest, NextResponse } from 'next/server';
import { AlpacaService } from '@/infrastructure/external-apis/alpaca-service';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, action, quantity, price } = body;
    
    // Execute with Alpaca
    const alpacaService = new AlpacaService();
    const order = await alpacaService.placeOrder(
      symbol,
      quantity,
      action.toLowerCase() as 'buy' | 'sell'
    );
    
    // Log trade in database
    await supabase.from('trades').insert([{
      symbol,
      action,
      quantity,
      price,
      order_id: order.id,
      status: order.status,
      executed_at: new Date().toISOString()
    }]);
    
    return NextResponse.json({
      success: true,
      orderId: order.id,
      message: `${action} order placed for ${quantity} shares of ${symbol}`
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}