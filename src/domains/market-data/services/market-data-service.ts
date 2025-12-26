import axios from 'axios';
import { RedisClient } from '@/infrastructure/cache/redis-client';
import { AlpacaService } from '@/infrastructure/external-apis/alpaca-service';

const redis = RedisClient.getInstance();

export async function fetchRealTimeQuotes(symbols: string[]): Promise<any[]> {
  try {
    const cacheKey = `quotes:${symbols.join(',')}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const alpaca = new AlpacaService();
    const quotes = await alpaca.getQuotes(symbols);
    
    await redis.setex(cacheKey, 30, JSON.stringify(quotes));
    
    return quotes;
  } catch (error) {
    console.error('Error fetching real-time quotes:', error);
    throw new Error('Failed to fetch market data');
  }
}

export async function getHistoricalData(symbol: string, timeframe: string = '1D'): Promise<any> {
  try {
    const cacheKey = `historical:${symbol}:${timeframe}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const alpaca = new AlpacaService();
    const data = await alpaca.getHistoricalData(symbol, timeframe);
    
    await redis.setex(cacheKey, 300, JSON.stringify(data));
    
    return data;
  } catch (error) {
    console.error('Error fetching historical data:', error);
    throw new Error('Failed to fetch historical data');
  }
}

export async function getMarketNews(symbol?: string): Promise<any[]> {
  try {
    const cacheKey = `news:${symbol || 'general'}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const response = await axios.get('https://api.polygon.io/v2/reference/news', {
      params: {
        apiKey: process.env.POLYGON_API_KEY,
        ticker: symbol,
        limit: 10
      }
    });
    
    const news = response.data.results || [];
    await redis.setex(cacheKey, 600, JSON.stringify(news));
    
    return news;
  } catch (error) {
    console.error('Error fetching market news:', error);
    return [];
  }
}

export class MarketDataService {
  static async getQuotes(symbols: string[]) {
    return await fetchRealTimeQuotes(symbols);
  }
  
  static async getHistorical(symbol: string, timeframe: string = '1D') {
    return await getHistoricalData(symbol, timeframe);
  }
  
  static async getNews(symbol?: string) {
    return await getMarketNews(symbol);
  }
  
  static async getMarketStatus() {
    try {
      const alpaca = new AlpacaService();
      return await alpaca.getMarketStatus();
    } catch (error) {
      console.error('Error fetching market status:', error);
      return { is_open: false };
    }
  }
  
  static async getMultipleSymbolsData(symbols: string[]) {
    try {
      const [quotes, news] = await Promise.all([
        this.getQuotes(symbols),
        this.getNews()
      ]);
      
      return {
        quotes,
        news: news.slice(0, 5),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching multiple symbols data:', error);
      throw new Error('Failed to fetch comprehensive market data');
    }
  }
  
  static async scanMarketForOpportunities() {
    try {
      const popularSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX'];
      const quotes = await this.getQuotes(popularSymbols);
      
      const opportunities = quotes.map(quote => {
        const volatility = Math.abs(quote.change || 0);
        const volume = quote.volume || 0;
        
        let opportunity = 'neutral';
        let confidence = 0.5;
        
        if (quote.change > 2 && volume > 1000000) {
          opportunity = 'bullish';
          confidence = Math.min(0.7 + (quote.change / 10), 0.95);
        } else if (quote.change < -2 && volume > 1000000) {
          opportunity = 'bearish';
          confidence = Math.min(0.7 + (Math.abs(quote.change) / 10), 0.95);
        }
        
        return {
          symbol: quote.symbol,
          current_price: quote.last_price,
          change: quote.change,
          volume,
          opportunity,
          confidence,
          timestamp: quote.timestamp
        };
      }).filter(opp => opp.opportunity !== 'neutral');
      
      return opportunities;
    } catch (error) {
      console.error('Error scanning market for opportunities:', error);
      return [];
    }
  }
}
