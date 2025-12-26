import { AlpacaClient } from '@alpacahq/alpaca-trade-api';

export class AlpacaService {
  private client: AlpacaClient;

  constructor() {
    const apiKey = process.env.ALPACA_API_KEY;
    const secretKey = process.env.ALPACA_SECRET_KEY;
    const paper = process.env.ALPACA_PAPER === 'true';

    if (!apiKey || !secretKey) {
      throw new Error('Alpaca API credentials are missing');
    }

    this.client = new AlpacaClient({
      key: apiKey,
      secret: secretKey,
      paper: paper,
    });
  }

  async getQuotes(symbols: string[]): Promise<any[]> {
    try {
      const quotes = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const quote = await this.client.getQuote(symbol);
            return {
              symbol,
              last_price: quote?.lastPrice || 0,
              change: quote?.changePercent || 0,
              volume: quote?.volume || 0,
              timestamp: new Date().toISOString(),
            };
          } catch (error) {
            console.error(`Error fetching quote for ${symbol}:`, error);
            return {
              symbol,
              last_price: 0,
              change: 0,
              volume: 0,
              timestamp: new Date().toISOString(),
              error: 'Failed to fetch quote',
            };
          }
        })
      );

      return quotes;
    } catch (error) {
      console.error('Error fetching quotes:', error);
      throw new Error('Failed to fetch market quotes');
    }
  }

  async getHistoricalData(symbol: string, timeframe: string = '1D'): Promise<any> {
    try {
      // For now, return mock data since Alpaca's historical data requires proper subscription
      return {
        symbol,
        timeframe,
        data: [],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error fetching historical data:', error);
      throw new Error('Failed to fetch historical data');
    }
  }

  async getMarketStatus(): Promise<{ is_open: boolean; next_open?: string }> {
    try {
      const clock = await this.client.getClock();
      return {
        is_open: clock.isOpen,
        next_open: clock.nextOpen,
      };
    } catch (error) {
      console.error('Error fetching market status:', error);
      return { is_open: false };
    }
  }

  async placeOrder(orderParams: any): Promise<any> {
    try {
      const order = await this.client.placeOrder(orderParams);
      return order;
    } catch (error) {
      console.error('Error placing order:', error);
      throw new Error('Failed to place order');
    }
  }

  async getOrders(): Promise<any[]> {
    try {
      const orders = await this.client.getOrders();
      return orders;
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
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
      };
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      return {
        account_value: 0,
        buying_power: 0,
        cash: 0,
        positions: [],
        total_market_value: 0,
        total_unrealized_pl: 0,
      };
    }
  }
}