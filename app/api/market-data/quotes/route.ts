import { NextRequest, NextResponse } from 'next/server';
import { MarketDataService } from '@/domains/market-data/services/market-data-service';
import { SYMBOLS } from '@/config/constants';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbolsParam = searchParams.get('symbols');
    
    const symbols = symbolsParam 
      ? symbolsParam.split(',')
      : SYMBOLS;

    const quotes = await MarketDataService.getQuotes(symbols);
    
    return NextResponse.json({
      success: true,
      data: quotes,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in quotes API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch quotes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}