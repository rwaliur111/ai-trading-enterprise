import { AlpacaClient } from '@alpacahq/alpaca-trade-api';

export class AlpacaService {
  private client: AlpacaClient;

  constructor() {
    const apiKey = process.env.ALPACA_API_KEY;
    const secretKey = process.env.ALPACA_SECRET_KEY;
    const paper = process.env.ALPACA_PAPER === 'true';

    if (!apiKey || !secretKey) {
      throw new Error('Alpaca API credentials are missing. Check your environment variables.');
    }

    this.client = new AlpacaClient({
      key: apiKey,
      secret: secretKey,
      paper: paper,
    });
  }

  async getQuotes(symbols: string[]): Promise<any[]> {
    try {
      const quotes = [];
      
      for (const symbol of symbols) {
        try {
          const quote = await this.client.getQuote(symbol);
          quotes.push({
            symbol,
            last_price: quote?.lastPrice || 0,
            change: quote?.changePercent || 0,
            volume: quote?.volume || 0,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.warn(`Failed to fetch quote for ${symbol}:`, error);
          quotes.push({
            symbol,
            last_price: 0,
            change: 0,
            volume: 0,
            timestamp: new Date().toISOString(),
            error: 'Failed to fetch quote',
          });
        }
      }

      return quotes;
    } catch (error) {
      console.error('Error in AlpacaService.getQuotes:', error);
      throw new Error('Failed to fetch market quotes');
    }
  }

  async getPortfolio(): Promise<any> {
    try {
      const account = await this.client.getAccount();
      const positions = await this.client.getPositions();
      
      return {
        account_value: account.portfolioValue,
        buying_power: account.buyingPower,
        cash: account.cash,
        positions: positions.map((pos: any) => ({
          symbol: pos.symbol,
          qty: pos.qty,
          avg_entry_price: pos.avgEntryPrice,
          market_value: pos.marketValue,
          unrealized_pl: pos.unrealizedPl,
        })),
        total_market_value: account.portfolioValue,
        total_unrealized_pl: positions.reduce((sum: number, pos: any) => sum + pos.unrealizedPl, 0),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error in AlpacaService.getPortfolio:', error);
      throw new Error('Failed to fetch portfolio data');
    }
  }

  async getOrders(): Promise<any[]> {
    try {
      const orders = await this.client.getOrders({
        status: 'all',
        limit: 50,
      });
      return orders;
    } catch (error) {
      console.error('Error in AlpacaService.getOrders:', error);
      return [];
    }
  }

  async placeOrder(orderParams: any): Promise<any> {
    try {
      const order = await this.client.placeOrder(orderParams);
      return order;
    } catch (error) {
      console.error('Error in AlpacaService.placeOrder:', error);
      throw new Error(`Failed to place order: ${error.message}`);
    }
  }
}