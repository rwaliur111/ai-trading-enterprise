import { NextRequest, NextResponse } from 'next/server';
import { MarketDataService } from '@/domains/market-data/services/market-data-service';
import { PortfolioService } from '@/application/services/portfolio-service';

export async function GET(request: NextRequest) {
  try {
    const portfolioService = new PortfolioService();
    const portfolio = await portfolioService.getPortfolio();
    
    if (portfolio.positions && portfolio.positions.length > 0) {
      const symbols = portfolio.positions.map((p: any) => p.symbol);
      const quotes = await MarketDataService.getQuotes(symbols);
      
      portfolio.positions = portfolio.positions.map((position: any) => {
        const quote = quotes.find((q: any) => q.symbol === position.symbol);
        return {
          ...position,
          current_price: quote?.last_price || position.avg_entry_price,
          market_value: quote?.last_price 
            ? quote.last_price * position.qty 
            : position.market_value,
          unrealized_pl: quote?.last_price
            ? (quote.last_price - position.avg_entry_price) * position.qty
            : position.unrealized_pl
        };
      });
      
      portfolio.total_market_value = portfolio.positions.reduce(
        (sum: number, p: any) => sum + p.market_value, 0
      );
      portfolio.total_unrealized_pl = portfolio.positions.reduce(
        (sum: number, p: any) => sum + p.unrealized_pl, 0
      );
    }

    return NextResponse.json({
      success: true,
      portfolio,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch portfolio',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
