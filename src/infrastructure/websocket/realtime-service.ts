import { WebSocket } from 'ws'
import { RedisClient } from '../cache/redis-client'
import { MarketDataService } from '@/domains/market-data/services/market-data-service'
import { SYMBOLS } from '@/config/constants'

interface WebSocketMessage {
  T: string  // Message type
  S: string  // Symbol
  [key: string]: any
}

export class RealtimeDataService {
  private ws: WebSocket | null = null
  private redis: RedisClient
  private marketDataService: MarketDataService
  private subscribers: Map<string, Set<(data: any) => void>> = new Map()
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000

  constructor() {
    this.redis = RedisClient.getInstance()
    this.marketDataService = new MarketDataService()
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Alpaca WebSocket endpoint (paper trading)
        const wsUrl = process.env.ALPACA_PAPER === 'true'
          ? 'wss://stream.data.alpaca.markets/v2/iex'
          : 'wss://stream.data.alpaca.markets/v2/iex'

        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('📡 WebSocket connected to Alpaca')
          this.isConnected = true
          this.reconnectAttempts = 0
          this.authenticate().then(resolve).catch(reject)
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data.toString())
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('WebSocket disconnected')
          this.isConnected = false
          this.handleReconnect()
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private async authenticate(): Promise<void> {
    if (!this.ws) return

    const authMsg = {
      action: 'auth',
      key: process.env.ALPACA_API_KEY,
      secret: process.env.ALPACA_API_SECRET
    }

    this.ws.send(JSON.stringify(authMsg))

    // Subscribe to symbols after authentication
    setTimeout(() => this.subscribeToSymbols(), 1000)
  }

  private async subscribeToSymbols(): Promise<void> {
    if (!this.ws) return

    // Subscribe to watchlist symbols
    const symbols = SYMBOLS.WATCHLIST.slice(0, 100) // Limit to 100 symbols

    const subscribeMsg = {
      action: 'subscribe',
      trades: symbols,
      quotes: symbols,
      bars: ['1Min', '5Min', '15Min', '1D']
    }

    this.ws.send(JSON.stringify(subscribeMsg))
    console.log(`📡 Subscribed to ${symbols.length} symbols`)
  }

  private handleMessage(data: string): void {
    try {
      const messages = JSON.parse(data)
      
      if (Array.isArray(messages)) {
        messages.forEach(msg => this.processMessage(msg))
      } else {
        this.processMessage(messages)
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  }

  private processMessage(message: WebSocketMessage): void {
    const { T: messageType, S: symbol, ...data } = message

    switch (messageType) {
      case 'success':
        console.log('WebSocket subscription successful:', data)
        break

      case 'error':
        console.error('WebSocket error:', data)
        break

      case 'subscription':
        console.log('Subscription update:', data)
        break

      case 't':
        this.handleTrade(symbol, data)
        break

      case 'q':
        this.handleQuote(symbol, data)
        break

      case 'b':
        this.handleBar(symbol, data)
        break

      default:
        console.log('Unknown message type:', messageType)
    }
  }

  private handleTrade(symbol: string, tradeData: any): void {
    const trade = {
      symbol,
      price: tradeData.p,
      size: tradeData.s,
      timestamp: new Date(tradeData.t).toISOString(),
      exchange: tradeData.x,
      conditions: tradeData.c,
      tape: tradeData.z
    }

    // Cache the latest trade
    this.redis.set(`trade:${symbol}`, JSON.stringify(trade), 60)
    
    // Notify subscribers
    this.notifySubscribers(symbol, { type: 'trade', data: trade })
  }

  private handleQuote(symbol: string, quoteData: any): void {
    const quote = {
      symbol,
      bidPrice: quoteData.bp,
      bidSize: quoteData.bs,
      askPrice: quoteData.ap,
      askSize: quoteData.as,
      timestamp: new Date(quoteData.t).toISOString(),
      conditions: quoteData.c
    }

    // Cache the latest quote
    this.redis.set(`quote:${symbol}`, JSON.stringify(quote), 5)
    
    // Update market data service cache
    this.updateMarketDataCache(symbol, quote)
    
    // Notify subscribers
    this.notifySubscribers(symbol, { type: 'quote', data: quote })
  }

  private handleBar(symbol: string, barData: any): void {
    const bar = {
      symbol,
      open: barData.o,
      high: barData.h,
      low: barData.l,
      close: barData.c,
      volume: barData.v,
      timestamp: new Date(barData.t).toISOString()
    }

    // Cache the bar
    const timeframe = barData.S || '1Min'
    this.redis.set(`bar:${symbol}:${timeframe}`, JSON.stringify(bar), 300)
    
    // Notify subscribers
    this.notifySubscribers(symbol, { type: 'bar', data: bar })
  }

  private async updateMarketDataCache(symbol: string, quote: any): Promise<void> {
    try {
      // Get current market data
      const currentData = await this.marketDataService.getRealTimeQuote(symbol)
      
      // Update with real-time quote
      const updatedData = {
        ...currentData,
        bid: quote.bidPrice,
        ask: quote.askPrice,
        bidSize: quote.bidSize,
        askSize: quote.askSize,
        timestamp: quote.timestamp
      }

      // Update cache
      this.redis.set(`market:${symbol}`, JSON.stringify(updatedData), 30)
    } catch (error) {
      console.error(`Error updating market data cache for ${symbol}:`, error)
    }
  }

  // Subscription management
  subscribe(symbol: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set())
    }

    this.subscribers.get(symbol)!.add(callback)

    // Return unsubscribe function
    return () => {
      const symbolSubscribers = this.subscribers.get(symbol)
      if (symbolSubscribers) {
        symbolSubscribers.delete(callback)
        if (symbolSubscribers.size === 0) {
          this.subscribers.delete(symbol)
        }
      }
    }
  }

  private notifySubscribers(symbol: string, data: any): void {
    const symbolSubscribers = this.subscribers.get(symbol)
    if (symbolSubscribers) {
      symbolSubscribers.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Error in subscriber callback:', error)
        }
      })
    }

    // Also notify wildcard subscribers
    const allSubscribers = this.subscribers.get('*')
    if (allSubscribers) {
      allSubscribers.forEach(callback => {
        try {
          callback({ symbol, ...data })
        } catch (error) {
          console.error('Error in wildcard subscriber callback:', error)
        }
      })
    }
  }

  // Reconnection logic
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    setTimeout(async () => {
      try {
        await this.connect()
      } catch (error) {
        console.error('Reconnection failed:', error)
        this.handleReconnect()
      }
    }, Math.min(delay, 30000)) // Max 30 seconds delay
  }

  // Public methods
  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
    this.subscribers.clear()
  }

  isReady(): boolean {
    return this.isConnected
 