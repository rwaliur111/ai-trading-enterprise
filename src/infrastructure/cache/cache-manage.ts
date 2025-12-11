import { redisClient } from './redis-client';

export class CacheManager {
  private readonly CACHE_TTL = {
    MARKET_DATA: 30, // seconds
    NEWS_SENTIMENT: 300,
    TECHNICAL_INDICATORS: 60,
    TRADING_SIGNALS: 120
  };

  async getWithFallback<T>(
    key: string, 
    fallback: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      if (cached !== null) {
        console.log(`Cache hit for key: ${key}`);
        return cached;
      }

      // If not in cache, execute fallback
      console.log(`Cache miss for key: ${key}`);
      const liveData = await fallback();
      
      // Store in cache for future requests
      await this.set(key, liveData, ttl);
      
      return liveData;
    } catch (error) {
      console.error('Cache error, using fallback:', error);
      // If cache fails, still try to get data from fallback
      return await fallback();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    return await redisClient.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await redisClient.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    await redisClient.del(key);
  }

  async clearPattern(pattern: string): Promise<void> {
    const keys = await redisClient.keys(pattern);
    for (const key of keys) {
      await this.del(key);
    }
  }

  // Specialized cache methods for different data types
  async cacheMarketData(symbol: string, data: any): Promise<void> {
    const key = `market_data:${symbol}`;
    await this.set(key, data, this.CACHE_TTL.MARKET_DATA);
  }

  async getMarketData(symbol: string): Promise<any> {
    const key = `market_data:${symbol}`;
    return await this.get(key);
  }

  async cacheNewsSentiment(symbol: string, data: any): Promise<void> {
    const key = `news_sentiment:${symbol}`;
    await this.set(key, data, this.CACHE_TTL.NEWS_SENTIMENT);
  }

  async getNewsSentiment(symbol: string): Promise<any> {
    const key = `news_sentiment:${symbol}`;
    return await this.get(key);
  }

  async cacheTechnicalIndicators(symbol: string, data: any): Promise<void> {
    const key = `technical_indicators:${symbol}`;
    await this.set(key, data, this.CACHE_TTL.TECHNICAL_INDICATORS);
  }

  async getTechnicalIndicators(symbol: string): Promise<any> {
    const key = `technical_indicators:${symbol}`;
    return await this.get(key);
  }
}