import { RedisClient } from '@/infrastructure/cache/redis-client';
import { AlpacaService } from '@/infrastructure/external-apis/alpaca-service';
import { PolygonService } from '@/infrastructure/external-apis/polygon-service';
import { AlphaVantageService } from '@/infrastructure/external-apis/alpha-vantage-service';
import { NewsService } from '@/infrastructure/external-apis/news-services';
import { TRADING_CONFIG, CACHE_CONFIG, SYMBOLS } from '@/config/constants';

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  vwap?: number;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  sector?: string;
  industry?: string;
}

export interface HistoricalData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export interface MarketNews {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: Date;
  symbols: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
}

export interface MarketOverview {
  sp500: MarketData;
  nasdaq: MarketData;
  dowJones: MarketData;
  fearGreedIndex: number;
  marketStatus: {
    isOpen: boolean;
    nextOpen?: Date;
    nextClose?: Date;
  };
  advancers: number;
  decliners: number;
  volume: number;
}

export class MarketDataService {
  private redis: RedisClient;
  private alpaca: AlpacaService;
  private polygon: PolygonService;
  private alphaVantage: AlphaVantageService;
  private newsService: NewsService;
  
  // Cache for frequently accessed data
  private symbolCache = new Map<string, MarketData>();
  private lastUpdate = new Map<string, Date>();

  constructor() {
    this.redis = RedisClient.getInstance();
    this.alpaca = new AlpacaService();
    this.polygon = new PolygonService();
    this.alphaVantage = new AlphaVantageService();
    this.newsService = new NewsService();
    
    // Initialize cache cleanup
    this.startCacheCleanup();
  }

  // Real-time quote for a single symbol
  async getRealTimeQuote(symbol: string): Promise<MarketData> {
    const cacheKey = `${CACHE_CONFIG.PREFIXES.QUOTE}${symbol}`;
    
    // Check memory cache first (fastest)
    const cached = this.symbolCache.get(symbol);
    const lastUpdate = this.lastUpdate.get(symbol);
    
    if (cached && lastUpdate && 
        (Date.now() - lastUpdate.getTime()) < CACHE_CONFIG.TTL.QUOTE * 1000) {
      return cached;
    }

    // Check Redis cache
    const redisCached = await this.redis.get(cacheKey);
    if (redisCached) {
      const data = JSON.parse(redisCached);
      this.symbolCache.set(symbol, data);
      this.lastUpdate.set(symbol, new Date());
      return data;
    }

    try {
      // Fetch from Alpaca (primary source)
      const quote = await this.alpaca.getQuote(symbol);
      
      // Enrich with additional data from Polygon
      const [tickerDetails, aggregates] = await Promise.all([
        this.polygon.getTickerDetails(symbol).catch(() => null),
        this.polygon.getAggregates(symbol, 'minute', 1).catch(() => null)
      ]);

      const marketData: MarketData = {
        symbol: quote.symbol,
        price: quote.lastPrice,
        change: quote.change,
        changePercent: quote.changePercent,
        volume: quote.volume,
        timestamp: new Date(quote.timestamp),
        high: aggregates?.results?.[0]?.h || quote.lastPrice * 1.01,
        low: aggregates?.results?.[0]?.l || quote.lastPrice * 0.99,
        open: aggregates?.results?.[0]?.o || quote.lastPrice * 0.995,
        previousClose: quote.lastPrice - quote.change,
        bid: quote.bidPrice,
        ask: quote.askPrice,
        bidSize: quote.bidSize,
        askSize: quote.askSize,
        marketCap: tickerDetails?.market_cap,
        peRatio: tickerDetails?.pe_ratio,
        dividendYield: tickerDetails?.dividend_yield,
        sector: tickerDetails?.sector,
        industry: tickerDetails?.industry
      };

      // Update caches
      this.symbolCache.set(symbol, marketData);
      this.lastUpdate.set(symbol, new Date());
      await this.redis.set(cacheKey, JSON.stringify(marketData), CACHE_CONFIG.TTL.QUOTE);

      return marketData;
    } catch (error) {
      console.error(`Error fetching real-time quote for ${symbol}:`, error);
      
      // Fallback to Alpha Vantage
      try {
        const timeSeries = await this.alphaVantage.getTimeSeriesDaily(symbol);
        const latest = Object.values(timeSeries['Time Series (Daily)'])[0];
        
        const fallbackData: MarketData = {
          symbol,
          price: parseFloat(latest['4. close']),
          change: parseFloat(latest['4. close']) - parseFloat(latest['1. open']),
          changePercent: ((parseFloat(latest['4. close']) - parseFloat(latest['1. open'])) / parseFloat(latest['1. open'])) * 100,
          volume: parseInt(latest['5. volume']),
          timestamp: new Date(),
          high: parseFloat(latest['2. high']),
          low: parseFloat(latest['3. low']),
          open: parseFloat(latest['1. open']),
          previousClose: parseFloat(latest['1. open']),
          bid: parseFloat(latest['4. close']) * 0.999,
          ask: parseFloat(latest['4. close']) * 1.001,
          bidSize: 100,
          askSize: 100
        };

        return fallbackData;
      } catch (fallbackError) {
        console.error(`Fallback also failed for ${symbol}:`, fallbackError);
        throw new Error(`Failed to fetch market data for ${symbol}`);
      }
    }
  }

  // Batch quotes for multiple symbols (optimized for performance)
  async getBatchQuotes(symbols: string[]): Promise<MarketData[]> {
    // Split into cached and uncached symbols
    const cachedResults: MarketData[] = [];
    const uncachedSymbols: string[] = [];
    const currentTime = Date.now();

    symbols.forEach(symbol => {
      const cached = this.symbolCache.get(symbol);
      const lastUpdate = this.lastUpdate.get(symbol);
      
      if (cached && lastUpdate && 
          (currentTime - lastUpdate.getTime()) < CACHE_CONFIG.TTL.QUOTE * 1000) {
        cachedResults.push(cached);
      } else {
        uncachedSymbols.push(symbol);
      }
    });

    // Fetch uncached symbols in parallel with batch size limit
    const batchSize = 20;
    const batches = [];
    
    for (let i = 0; i < uncachedSymbols.length; i += batchSize) {
      const batch = uncachedSymbols.slice(i, i + batchSize);
      batches.push(batch);
    }

    const fetchPromises = batches.map(async (batch) => {
      return Promise.all(batch.map(symbol => this.getRealTimeQuote(symbol)));
    });

    const batchResults = await Promise.all(fetchPromises);
    const uncachedResults = batchResults.flat();

    return [...cachedResults, ...uncachedResults].sort((a, b) => 
      symbols.indexOf(a.symbol) - symbols.indexOf(b.symbol)
    );
  }

  // Get market overview (SPY, QQQ, DIA, etc.)
  async getMarketOverview(): Promise<MarketOverview> {
    const cacheKey = 'market:overview';
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      const [sp500, nasdaq, dowJones, marketStatus] = await Promise.all([
        this.getRealTimeQuote('SPY'),
        this.getRealTimeQuote('QQQ'),
        this.getRealTimeQuote('DIA'),
        this.getMarketStatus()
      ]);

      // Get advance/decline data
      const allSymbols = [...SYMBOLS.WATCHLIST, ...SYMBOLS.INDICES];
      const quotes = await this.getBatchQuotes(allSymbols.slice(0, 100));
      
      const advancers = quotes.filter(q => q.changePercent > 0).length;
      const decliners = quotes.filter(q => q.changePercent < 0).length;
      const totalVolume = quotes.reduce((sum, q) => sum + q.volume, 0);

      // Calculate Fear & Greed Index (simplified)
      const fearGreedIndex = this.calculateFearGreedIndex(quotes);

      const overview: MarketOverview = {
        sp500,
        nasdaq,
        dowJones,
        fearGreedIndex,
        marketStatus,
        advancers,
        decliners,
        volume: totalVolume
      };

      await this.redis.set(cacheKey, JSON.stringify(overview), 60); // Cache for 1 minute
      return overview;
    } catch (error) {
      console.error('Error fetching market overview:', error);
      throw error;
    }
  }

  // Get historical data with multiple timeframes
  async getHistoricalData(
    symbol: string, 
    timeframe: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'day',
    limit: number = 100
  ): Promise<HistoricalData[]> {
    const cacheKey = `${CACHE_CONFIG.PREFIXES.HISTORICAL}${symbol}:${timeframe}:${limit}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      let aggregates;
      const now = new Date();
      const from = new Date();

      switch (timeframe) {
        case 'minute':
          from.setMinutes(now.getMinutes() - limit);
          aggregates = await this.polygon.getAggregates(
            symbol, 
            'minute',
            from.toISOString().split('T')[0],
            now.toISOString().split('T')[0]
          );
          break;
        case 'hour':
          from.setHours(now.getHours() - limit);
          aggregates = await this.polygon.getAggregates(
            symbol,
            'hour',
            from.toISOString().split('T')[0],
            now.toISOString().split('T')[0]
          );
          break;
        case 'day':
          from.setDate(now.getDate() - limit);
          aggregates = await this.polygon.getAggregates(
            symbol,
            'day',
            from.toISOString().split('T')[0],
            now.toISOString().split('T')[0]
          );
          break;
        default:
          from.setDate(now.getDate() - limit);
          aggregates = await this.polygon.getAggregates(
            symbol,
            'day',
            from.toISOString().split('T')[0],
            now.toISOString().split('T')[0]
          );
      }

      if (aggregates?.results) {
        const historicalData: HistoricalData[] = aggregates.results.map((result: any) => ({
          timestamp: new Date(result.t),
          open: result.o,
          high: result.h,
          low: result.l,
          close: result.c,
          volume: result.v,
          vwap: result.vw
        })).reverse(); // Reverse to chronological order

        await this.redis.set(cacheKey, JSON.stringify(historicalData), CACHE_CONFIG.TTL.HISTORICAL);
        return historicalData;
      }
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
    }

    // Generate mock historical data as fallback
    return this.generateMockHistoricalData(symbol, timeframe, limit);
  }

  // Get market status
  async getMarketStatus(): Promise<{
    isOpen: boolean;
    nextOpen?: Date;
    nextClose?: Date;
    currentTime: Date;
  }> {
    try {
      return await this.alpaca.getMarketStatus();
    } catch (error) {
      console.error('Error getting market status:', error);
      
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
        nextClose,
        currentTime: now
      };
    }
  }

  // Get market news with sentiment analysis
  async getMarketNews(limit: number = 20): Promise<MarketNews[]> {
    const cacheKey = `${CACHE_CONFIG.PREFIXES.NEWS}general:${limit}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      const news = await this.newsService.getMarketNews(undefined, limit * 2); // Get extra for filtering
      
      const processedNews = await Promise.all(
        news.map(async (article) => {
          const symbols = this.extractSymbolsFromText(article.title + ' ' + article.description);
          const sentiment = await this.analyzeSentiment(article);
          
          return {
            ...article,
            publishedAt: new Date(article.publishedAt),
            symbols,
            sentiment: sentiment.sentiment,
            sentimentScore: sentiment.score
          };
        })
      );

      // Sort by relevance and sentiment
      const sortedNews = processedNews
        .filter(article => article.symbols.length > 0 || article.sentimentScore > 0.3)
        .sort((a, b) => b.sentimentScore - a.sentimentScore)
        .slice(0, limit);

      await this.redis.set(cacheKey, JSON.stringify(sortedNews), CACHE_CONFIG.TTL.NEWS);
      return sortedNews;
    } catch (error) {
      console.error('Error fetching market news:', error);
      return [];
    }
  }

  // Scan for potential trading opportunities
  async scanForOpportunities(
    criteria: {
      minVolume?: number;
      minPrice?: number;
      maxPrice?: number;
      sectors?: string[];
      minChangePercent?: number;
      maxChangePercent?: number;
    } = {}
  ): Promise<MarketData[]> {
    // Get all symbols from watchlist
    const symbols = SYMBOLS.WATCHLIST;
    const quotes = await this.getBatchQuotes(symbols);

    // Apply filters
    let filtered = quotes;

    if (criteria.minVolume) {
      filtered = filtered.filter(q => q.volume >= criteria.minVolume!);
    }

    if (criteria.minPrice) {
      filtered = filtered.filter(q => q.price >= criteria.minPrice!);
    }

    if (criteria.maxPrice) {
      filtered = filtered.filter(q => q.price <= criteria.maxPrice!);
    }

    if (criteria.minChangePercent) {
      filtered = filtered.filter(q => q.changePercent >= criteria.minChangePercent!);
    }

    if (criteria.maxChangePercent) {
      filtered = filtered.filter(q => q.changePercent <= criteria.maxChangePercent!);
    }

    // Sort by volume * change (momentum)
    return filtered.sort((a, b) => 
      (b.volume * Math.abs(b.changePercent)) - (a.volume * Math.abs(a.changePercent))
    ).slice(0, 20); // Return top 20
  }

  // Get options data (if needed)
  async getOptionsData(symbol: string, expiration?: string) {
    // Implementation for options data
    // This would integrate with Polygon or other options data providers
    return null;
  }

  // Private helper methods
  private calculateFearGreedIndex(quotes: MarketData[]): number {
    if (quotes.length === 0) return 50;

    const avgChange = quotes.reduce((sum, q) => sum + q.changePercent, 0) / quotes.length;
    const volatility = Math.sqrt(
      quotes.reduce((sum, q) => sum + Math.pow(q.changePercent - avgChange, 2), 0) / quotes.length
    );

    // Simplified calculation
    let index = 50;
    
    if (avgChange > 1) index += 20;
    if (avgChange > 2) index += 10;
    if (avgChange < -1) index -= 20;
    if (avgChange < -2) index -= 10;
    
    if (volatility > 3) index -= 15;
    if (volatility < 1) index += 10;

    return Math.max(0, Math.min(100, index));
  }

  private extractSymbolsFromText(text: string): string[] {
    const symbols: string[] = [];
    const upperText = text.toUpperCase();
    
    // Check for common symbols
    SYMBOLS.WATCHLIST.forEach(symbol => {
      if (upperText.includes(symbol) || 
          upperText.includes(`$${symbol}`) ||
          upperText.includes(`${symbol} `)) {
        symbols.push(symbol);
      }
    });

    // Check for indices
    SYMBOLS.INDICES.forEach(index => {
      if (upperText.includes(index) || 
          upperText.includes(`$${index}`)) {
        symbols.push(index);
      }
    });

    return [...new Set(symbols)]; // Remove duplicates
  }

  private async analyzeSentiment(article: any): Promise<{sentiment: string, score: number}> {
    const text = (article.title + ' ' + article.description).toLowerCase();
    
    const positiveWords = [
      'gain', 'rise', 'up', 'bull', 'positive', 'strong', 'beat', 'profit',
      'earnings', 'growth', 'surge', 'rally', 'soar', 'jump', 'increase'
    ];
    
    const negativeWords = [
      'loss', 'fall', 'down', 'bear', 'negative', 'weak', 'miss', 'decline',
      'drop', 'plunge', 'crash', 'selloff', 'warn', 'cut', 'reduce', 'delay'
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = text.match(regex);
      if (matches) positiveCount += matches.length;
    });

    negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = text.match(regex);
      if (matches) negativeCount += matches.length;
    });

    const total = positiveCount + negativeCount;
    if (total === 0) return { sentiment: 'neutral', score: 0 };

    const score = (positiveCount - negativeCount) / total;
    
    if (score > 0.2) return { sentiment: 'positive', score };
    if (score < -0.2) return { sentiment: 'negative', score };
    return { sentiment: 'neutral', score: 0 };
  }

  private generateMockHistoricalData(
    symbol: string, 
    timeframe: string, 
    limit: number
  ): HistoricalData[] {
    const data: HistoricalData[] = [];
    let basePrice = 100 + Math.random() * 900;
    
    for (let i = 0; i < limit; i++) {
      const date = new Date();
      
      switch (timeframe) {
        case 'minute':
          date.setMinutes(date.getMinutes() - i);
          break;
        case 'hour':
          date.setHours(date.getHours() - i);
          break;
        case 'day':
          date.setDate(date.getDate() - i);
          break;
        default:
          date.setDate(date.getDate() - i);
      }

      const change = (Math.random() - 0.5) * 10;
      basePrice += change;
      
      data.push({
        timestamp: date,
        open: basePrice - Math.random() * 2,
        high: basePrice + Math.random() * 3,
        low: basePrice - Math.random() * 3,
        close: basePrice,
        volume: 1000000 + Math.random() * 5000000
      });
    }

    return data.reverse();
  }

  private startCacheCleanup(): void {
    // Clean memory cache every 5 minutes
    setInterval(() => {
      const now = Date.now();
      this.lastUpdate.forEach((timestamp, symbol) => {
        if (now - timestamp.getTime() > CACHE_CONFIG.TTL.QUOTE * 1000 * 10) {
          this.symbolCache.delete(symbol);
          this.lastUpdate.delete(symbol);
        }
      });
    }, 300000); // 5 minutes
  }

  // Get all available symbols (from Alpaca or Polygon)
  async getAllSymbols(assetClass: string = 'us_equity'): Promise<string[]> {
    try {
      const assets = await this.alpaca.getAssets('active', assetClass);
      return assets.map((asset: any) => asset.symbol).slice(0, 1000); // Limit to 1000 symbols
    } catch (error) {
      console.error('Error fetching all symbols:', error);
      return SYMBOLS.WATCHLIST;
    }
  }

  // Get sector performance
  async getSectorPerformance(): Promise<Record<string, number>> {
    const sectors = SYMBOLS.SECTORS;
    const quotes = await this.getBatchQuotes(sectors);
    
    const performance: Record<string, number> = {};
    quotes.forEach(quote => {
      performance[quote.symbol] = quote.changePercent;
    });

    return performance;
  }
}