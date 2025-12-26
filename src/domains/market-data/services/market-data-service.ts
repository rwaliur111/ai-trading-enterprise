import axios from 'axios';
import { RedisClient } from '@/infrastructure/redis/redis-client';
import { AlpacaService } from '@/infrastructure/brokers/alpaca-service';

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

// ADD THIS CLASS - FIXES THE IMPORT ERRORS
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
}