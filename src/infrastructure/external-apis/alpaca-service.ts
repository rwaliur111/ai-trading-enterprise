// Create src/infrastructure/external-apis/alpaca-service.ts
@'
import axios from 'axios'

export interface AlpacaAccount {
  id: string
  account_number: string
  status: string
  currency: string
  buying_power: number
  cash: number
  portfolio_value: number
  pattern_day_trader: boolean
  trading_blocked: boolean
  transfers_blocked: boolean
  account_blocked: boolean
  created_at: string
  shorting_enabled: boolean
  equity: number
  last_equity: number
  multiplier: number
}

export interface AlpacaOrder {
  id: string
  client_order_id: string
  created_at: string
  updated_at: string
  submitted_at: string
  filled_at: string | null
  expired_at: string | null
  canceled_at: string | null
  failed_at: string | null
  replaced_at: string | null
  replaced_by: string | null
  replaces: string | null
  asset_id: string
  symbol: string
  asset_class: string
  notional: number | null
  qty: number | null
  filled_qty: number
  filled_avg_price: number | null
  order_class: string
  order_type: string
  type: string
  side: string
  time_in_force: string
  limit_price: number | null
  stop_price: number | null
  status: string
  extended_hours: boolean
  legs: any[] | null
  trail_percent: number | null
  trail_price: number | null
  hwm: number | null
}

export class AlpacaService {
  private baseUrl: string
  private apiKey: string
  private secretKey: string

  constructor() {
    this.apiKey = process.env.ALPACA_API_KEY!
    this.secretKey = process.env.ALPACA_SECRET_KEY!
    this.baseUrl = process.env.ALPACA_PAPER === 'true' 
      ? 'https://paper-api.alpaca.markets/v2'
      : 'https://api.alpaca.markets/v2'
  }

  private getHeaders() {
    return {
      'APCA-API-KEY-ID': this.apiKey,
      'APCA-API-SECRET-KEY': this.secretKey
    }
  }

  async getAccount(): Promise<AlpacaAccount> {
    try {
      const response = await axios.get(`${this.baseUrl}/account`, {
        headers: this.getHeaders()
      })
      return response.data
    } catch (error) {
      console.error('Error fetching Alpaca account:', error)
      throw error
    }
  }

  async getPositions(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/positions`, {
        headers: this.getHeaders()
      })
      return response.data
    } catch (error) {
      console.error('Error fetching positions:', error)
      throw error
    }
  }

  async getOrders(): Promise<AlpacaOrder[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/orders`, {
        headers: this.getHeaders(),
        params: {
          status: 'all',
          limit: 50
        }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching orders:', error)
      throw error
    }
  }

  async placeOrder(orderData: {
    symbol: string
    qty: number
    side: 'buy' | 'sell'
    type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop'
    time_in_force: 'day' | 'gtc' | 'opg' | 'cls' | 'ioc' | 'fok'
    limit_price?: number
    stop_price?: number
    trail_percent?: number
    trail_price?: number
  }): Promise<AlpacaOrder> {
    try {
      const response = await axios.post(`${this.baseUrl}/orders`, orderData, {
        headers: this.getHeaders()
      })
      return response.data
    } catch (error) {
      console.error('Error placing order:', error)
      throw error
    }
  }

  async cancelOrder(orderId: string): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/orders/${orderId}`, {
        headers: this.getHeaders()
      })
    } catch (error) {
      console.error('Error canceling order:', error)
      throw error
    }
  }

  async getMarketData(symbols: string[], timeframe: string = '1Min'): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/stocks/bars`, {
        headers: this.getHeaders(),
        params: {
          symbols: symbols.join(','),
          timeframe,
          limit: 100
        }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching market data:', error)
      throw error
    }
  }
}
'@ | Set-Content -Path ".\src\infrastructure\external-apis\alpaca-service.ts" -Encoding UTF8