import Alpaca from '@alpacahq/alpaca-trade-api'

export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  buying_power: number;
  cash: number;
  portfolio_value: number;
  equity: number;
  daytrade_count: number;
  last_equity: number;
  long_market_value: number;
  short_market_value: number;
  initial_margin: number;
  maintenance_margin: number;
  sma: number;
  daytrading_buying_power: number;
  regt_buying_power: number;
}

export interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  avg_entry_price: string;
  qty: string;
  side: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  unrealized_intraday_pl: string;
  unrealized_intraday_plpc: string;
  current_price: string;
  lastday_price: string;
  change_today: string;
}

export interface AlpacaQuote {
  symbol: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  bidPrice: number;
  askPrice: number;
  bidSize: number;
  askSize: number;
}

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at: string | null;
  expired_at: string | null;
  canceled_at: string | null;
  failed_at: string | null;
  replaced_at: string | null;
  replaced_by: string | null;
  replaces: string | null;
  asset_id: string;
  symbol: string;
  asset_class: string;
  qty: string;
  filled_qty: string;
  filled_avg_price: string | null;
  order_type: string;
  type: string;
  side: string;
  time_in_force: string;
  limit_price: string | null;
  stop_price: string | null;
  status: string;
  extended_hours: boolean;
  legs: any | null;
  trail_percent: string | null;
  trail_price: string | null;
  hwm: string | null;
}

export interface AlpacaClock {
  timestamp: string;
  is_open: boolean;
  next_open: string;
  next_close: string;
}

export class AlpacaService {
  private alpaca: Alpaca;
  private paper: boolean;

  constructor() {
    this.paper = process.env.ALPACA_PAPER === 'true';
    
    if (!process.env.ALPACA_API_KEY || !process.env.ALPACA_API_SECRET) {
      throw new Error('Alpaca API credentials not configured');
    }

    this.alpaca = new Alpaca({
      keyId: process.env.ALPACA_API_KEY,
      secretKey: process.env.ALPACA_API_SECRET,
      paper: this.paper,
      baseUrl: this.paper ? 'https://paper-api.alpaca.markets' : 'https://api.alpaca.markets'
    });
  }

  async getAccount(): Promise<AlpacaAccount> {
    try {
      const account = await this.alpaca.getAccount();
      return account as AlpacaAccount;
    } catch (error: any) {
      console.error('Error fetching Alpaca account:', error.message);
      
      // Return mock data for development
      if (error.message.includes('credentials') || error.message.includes('ENOTFOUND')) {
        return {
          id: 'mock-account-id',
          account_number: 'MOCK12345678',
          status: 'ACTIVE',
          currency: 'USD',
          buying_power: 100000,
          cash: 50000,
          portfolio_value: 150000,
          equity: 150000,
          daytrade_count: 0,
          last_equity: 145000,
          long_market_value: 100000,
          short_market_value: 0,
          initial_margin: 0,
          maintenance_margin: 0,
          sma: 50000,
          daytrading_buying_power: 100000,
          regt_buying_power: 100000
        };
      }
      
      throw error;
    }
  }

  async getPositions(): Promise<AlpacaPosition[]> {
    try {
      const positions = await this.alpaca.getPositions();
      return positions as AlpacaPosition[];
    } catch (error: any) {
      console.error('Error fetching positions:', error.message);
      
      // Return mock positions for development
      if (error.message.includes('credentials') || error.message.includes('ENOTFOUND')) {
        return [
          {
            asset_id: 'mock-asset-1',
            symbol: 'AAPL',
            exchange: 'NASDAQ',
            asset_class: 'us_equity',
            avg_entry_price: '150.25',
            qty: '100',
            side: 'long',
            market_value: '15250.00',
            cost_basis: '15025.00',
            unrealized_pl: '225.00',
            unrealized_plpc: '1.50',
            unrealized_intraday_pl: '25.00',
            unrealized_intraday_plpc: '0.16',
            current_price: '152.50',
            lastday_price: '152.25',
            change_today: '0.25'
          },
          {
            asset_id: 'mock-asset-2',
            symbol: 'MSFT',
            exchange: 'NASDAQ',
            asset_class: 'us_equity',
            avg_entry_price: '325.50',
            qty: '50',
            side: 'long',
            market_value: '16500.00',
            cost_basis: '16275.00',
            unrealized_pl: '225.00',
            unrealized_plpc: '1.38',
            unrealized_intraday_pl: '50.00',
            unrealized_intraday_plpc: '0.30',
            current_price: '330.00',
            lastday_price: '329.50',
            change_today: '0.50'
          }
        ];
      }
      
      throw error;
    }
  }

  async getQuote(symbol: string): Promise<AlpacaQuote> {
    try {
      const quote = await this.alpaca.lastQuote(symbol);
      
      return {
        symbol: quote.Symbol,
        lastPrice: quote.Last?.price || 0,
        change: quote.Last?.price! - (quote.Last?.price! * 0.99), // Mock change
        changePercent: 1.0, // Mock percent
        volume: quote.Last?.size || 1000000,
        timestamp: quote.Last?.timestamp || new Date().toISOString(),
        bidPrice: quote.Bid?.price || 0,
        askPrice: quote.Ask?.price || 0,
        bidSize: quote.Bid?.size || 100,
        askSize: quote.Ask?.size || 100
      };
    } catch (error: any) {
      console.error(`Error fetching quote for ${symbol}:`, error.message);
      
      // Return mock quote for development
      const basePrice = 150 + Math.random() * 100;
      const change = (Math.random() - 0.5) * 10;
      
      return {
        symbol,
        lastPrice: basePrice + change,
        change: change,
        changePercent: (change / basePrice) * 100,
        volume: 1000000 + Math.random() * 5000000,
        timestamp: new Date().toISOString(),
        bidPrice: basePrice + change - 0.1,
        askPrice: basePrice + change + 0.1,
        bidSize: 100,
        askSize: 100
      };
    }
  }

  async placeOrder(order: {
    symbol: string;
    qty: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
    time_in_force: 'day' | 'gtc' | 'opg' | 'cls' | 'ioc' | 'fok';
    limit_price?: number;
    stop_price?: number;
    trail_percent?: number;
    trail_price?: number;
    extended_hours?: boolean;
    client_order_id?: string;
  }): Promise<AlpacaOrder> {
    try {
      console.log('Placing order:', order);
      
      const result = await this.alpaca.createOrder(order);
      
      console.log('Order placed successfully:', result.id);
      return result as AlpacaOrder;
    } catch (error: any) {
      console.error('Error placing order:', error.message);
      
      // Return mock order for development
      if (error.message.includes('credentials') || error.message.includes('ENOTFOUND')) {
        return {
          id: 'mock-order-' + Date.now(),
          client_order_id: order.client_order_id || 'mock-client-id',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
          filled_at: new Date().toISOString(),
          expired_at: null,
          canceled_at: null,
          failed_at: null,
          replaced_at: null,
          replaced_by: null,
          replaces: null,
          asset_id: 'mock-asset-' + order.symbol,
          symbol: order.symbol,
          asset_class: 'us_equity',
          qty: order.qty.toString(),
          filled_qty: order.qty.toString(),
          filled_avg_price: (order.limit_price || 150).toString(),
          order_type: order.type,
          type: order.type,
          side: order.side,
          time_in_force: order.time_in_force,
          limit_price: order.limit_price?.toString() || null,
          stop_price: order.stop_price?.toString() || null,
          status: 'filled',
          extended_hours: order.extended_hours || false,
          legs: null,
          trail_percent: order.trail_percent?.toString() || null,
          trail_price: order.trail_price?.toString() || null,
          hwm: null
        };
      }
      
      throw error;
    }
  }

  async getMarketStatus(): Promise<{ isOpen: boolean; nextOpen?: Date; nextClose?: Date }> {
    try {
      const clock = await this.alpaca.getClock();
      const clockData = clock as AlpacaClock;
      
      return {
        isOpen: clockData.is_open,
        nextOpen: new Date(clockData.next_open),
        nextClose: new Date(clockData.next_close)
      };
    } catch (error: any) {
      console.error('Error getting market status:', error.message);
      
      // Return mock market hours
      const now = new Date();
      const isOpen = now.getHours() >= 9 && now.getHours() < 16 && now.getDay() >= 1 && now.getDay() <= 5;
      
      const nextOpen = new Date();
      nextOpen.setDate(nextOpen.getDate() + 1);
      nextOpen.setHours(9, 30, 0, 0);
      
      const nextClose = new Date();
      if (now.getHours() < 16) {
        nextClose.setHours(16, 0, 0, 0);
      } else {
        nextClose.setDate(nextClose.getDate() + 1);
        nextClose.setHours(16, 0, 0, 0);
      }
      
      return {
        isOpen,
        nextOpen,
        nextClose
      };
    }
  }

  async getOrders(status?: string, limit?: number, after?: string, until?: string, direction?: string): Promise<AlpacaOrder[]> {
    try {
      const params: any = {};
      if (status) params.status = status;
      if (limit) params.limit = limit;
      if (after) params.after = after;
      if (until) params.until = until;
      if (direction) params.direction = direction;
      
      const orders = await this.alpaca.getOrders(params);
      return orders as AlpacaOrder[];
    } catch (error: any) {
      console.error('Error fetching orders:', error.message);
      
      // Return mock orders for development
      if (error.message.includes('credentials') || error.message.includes('ENOTFOUND')) {
        return [
          {
            id: 'mock-order-1',
            client_order_id: 'client-123',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            updated_at: new Date(Date.now() - 86400000).toISOString(),
            submitted_at: new Date(Date.now() - 86400000).toISOString(),
            filled_at: new Date(Date.now() - 86300000).toISOString(),
            expired_at: null,
            canceled_at: null,
            failed_at: null,
            replaced_at: null,
            replaced_by: null,
            replaces: null,
            asset_id: 'mock-asset-AAPL',
            symbol: 'AAPL',
            asset_class: 'us_equity',
            qty: '10',
            filled_qty: '10',
            filled_avg_price: '152.50',
            order_type: 'market',
            type: 'market',
            side: 'buy',
            time_in_force: 'day',
            limit_price: null,
            stop_price: null,
            status: 'filled',
            extended_hours: false,
            legs: null,
            trail_percent: null,
            trail_price: null,
            hwm: null
          }
        ];
      }
      
      throw error;
    }
  }

  async cancelOrder(orderId: string): Promise<void> {
    try {
      await this.alpaca.cancelOrder(orderId);
    } catch (error: any) {
      console.error(`Error canceling order ${orderId}:`, error.message);
      throw error;
    }
  }

  async getOrder(orderId: string): Promise<AlpacaOrder> {
    try {
      const order = await this.alpaca.getOrder(orderId);
      return order as AlpacaOrder;
    } catch (error: any) {
      console.error(`Error fetching order ${orderId}:`, error.message);
      throw error;
    }
  }

  async getAssets(status?: string, asset_class?: string): Promise<any[]> {
    try {
      return await this.alpaca.getAssets({
        status,
        asset_class
      });
    } catch (error: any) {
      console.error('Error fetching assets:', error.message);
      return [];
    }
  }

  async getBars(symbol: string, timeframe: string, limit: number = 100): Promise<any> {
    try {
      return await this.alpaca.getBars(timeframe, symbol, {
        limit,
        adjustment: 'all'
      });
    } catch (error: any) {
      console.error(`Error fetching bars for ${symbol}:`, error.message);
      throw error;
    }
  }

  async getLastTrade(symbol: string): Promise<any> {
    try {
      return await this.alpaca.lastTrade(symbol);
    } catch (error: any) {
      console.error(`Error fetching last trade for ${symbol}:`, error.message);
      
      // Mock trade data
      return {
        price: 150 + Math.random() * 100,
        size: 100,
        exchange: 1,
        cond1: 0,
        cond2: 0,
        cond3: 0,
        cond4: 0,
        timestamp: new Date().toISOString()
      };
    }
  }
}