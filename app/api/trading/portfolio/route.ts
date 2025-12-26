import { NextRequest, NextResponse } from 'next/server';
import { MarketDataService } from '@/domains/market-data/services/market-data-service';
import { PortfolioService } from '@/application/services/portfolio-service';

// Remove the auth import and add this function
async function checkAuth() {
  // Simple auth check
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return { authenticated: true }; // Development mode
  }
  return { authenticated: false, error: 'Unauthorized' };
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

    const portfolioService = new PortfolioService();
    const portfolio = await portfolioService.getPortfolio();
    
    // Get current prices for portfolio items
    if (portfolio.positions && portfolio.positions.length > 0) {
      const symbols = portfolio.positions.map((p: any) => p.symbol);
      const quotes = await MarketDataService.getQuotes(symbols);
      
      // Update positions with current prices
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
      
      // Recalculate totals
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
      timestamp: new Date().toISOString(),
      message: portfolio.positions && portfolio.positions.length > 0 
        ? 'Live portfolio data' 
        : 'Demo portfolio - add mock positions in portfolio-service.ts'
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