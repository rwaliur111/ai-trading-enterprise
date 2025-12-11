// Create src/domains/market-data/services/market-data-service.ts
@'
import axios from 'axios'
import { Redis } from 'ioredis'

export interface MarketQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  timestamp: string
  high: number
  low: number
  open: number
  previousClose: number
}

export class MarketDataService {
  private redis: Redis
  private polygonApiKey: string
  private alphaVantageApiKey: string

  constructor() {
    this.polygonApiKey = process.env.POLYGON_API_KEY!
    this.alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY!
    this.redis = new Redis(process.env.REDIS_URL!)
  }

  async getRealTimeQuote(symbol: string): Promise<MarketQuote> {
    const cacheKey = `quote:${symbol}:${new Date().toISOString().slice(0, 10)}`
    
    // Try cache first
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    try {
      // Try Polygon.io first (real-time data)
      const polygonUrl = `https://api.polygon.io/v2/last/trade/${symbol}?apiKey=${this.polygonApiKey}`
      const polygonResponse = await axios.get(polygonUrl)
      
      if (polygonResponse.data && polygonResponse.data.results) {
        const quote: MarketQuote = {
          symbol,
          price: polygonResponse.data.results.p,
          change: 0, // We'll calculate this
          changePercent: 0,
          volume: polygonResponse.data.results.s,
          timestamp: new Date(polygonResponse.data.results.t).toISOString(),
          high: 0,
          low: 0,
          open: 0,
          previousClose: 0
        }

        // Get additional data from Alpha Vantage
        const alphaUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.alphaVantageApiKey}`
        const alphaResponse = await axios.get(alphaUrl)
        
        if (alphaResponse.data && alphaResponse.data['Global Quote']) {
          const data = alphaResponse.data['Global Quote']
          quote.change = parseFloat(data['09. change'])
          quote.changePercent = parseFloat(data['10. change percent'].replace('%', ''))
          quote.high = parseFloat(data['03. high'])
          quote.low = parseFloat(data['04. low'])
          quote.open = parseFloat(data['02. open'])
          quote.previousClose = parseFloat(data['08. previous close'])
        }

        // Cache for 1 minute
        await this.redis.setex(cacheKey, 60, JSON.stringify(quote))
        return quote
      }
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error)
    }

    // Fallback to Alpha Vantage
    const fallbackUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.alphaVantageApiKey}`
    const response = await axios.get(fallbackUrl)
    
    if (response.data && response.data['Global Quote']) {
      const data = response.data['Global Quote']
      const quote: MarketQuote = {
        symbol,
        price: parseFloat(data['05. price']),
        change: parseFloat(data['09. change']),
        changePercent: parseFloat(data['10. change percent'].replace('%', '')),
        volume: parseInt(data['06. volume']),
        timestamp: new Date().toISOString(),
        high: parseFloat(data['03. high']),
        low: parseFloat(data['04. low']),
        open: parseFloat(data['02. open']),
        previousClose: parseFloat(data['08. previous close'])
      }

      await this.redis.setex(cacheKey, 60, JSON.stringify(quote))
      return quote
    }

    throw new Error(`Could not fetch quote for ${symbol}`)
  }

  async getMultipleQuotes(symbols: string[]): Promise<MarketQuote[]> {
    const quotes: MarketQuote[] = []
    
    for (const symbol of symbols) {
      try {
        const quote = await this.getRealTimeQuote(symbol)
        quotes.push(quote)
      } catch (error) {
        console.error(`Failed to get quote for ${symbol}:`, error)
      }
    }
    
    return quotes
  }

  async getPopularStocks(): Promise<MarketQuote[]> {
    const popularSymbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'AMZN', 'META', 'AMD']
    return this.getMultipleQuotes(popularSymbols)
  }
}
'@ | Set-Content -Path ".\src\domains\market-data\services\market-data-service.ts" -Encoding UTF8