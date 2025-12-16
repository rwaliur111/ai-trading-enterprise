import Redis from 'ioredis';
import { PolygonService } from '../../../infrastructure/external-apis/polygon-service';
import { AlphaVantageService } from '../../../infrastructure/external-apis/alpha-vantage-service';
import { NewsAPIService } from '../../../infrastructure/external-apis/newsapi-service';

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
  bid?: number;
  ask?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
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
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: Date;
  symbols: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number;
}

export interface MarketOverview {
  fearGreedIndex: number;
  marketStatus: 'open' | 'closed' | 'pre' | 'post';
  sp500Change: number;
  nasdaqChange: number;
  dowJonesChange: number;
  vix: number;
  putCallRatio: number;
}

export class MarketDataService {
  private polygon: PolygonService;
  private alphaVantage: AlphaVantageService;
  private newsAPI: NewsAPIService;
  private redis: Redis;

  constructor() {
    this.polygon = new PolygonService();
    this.alphaVantage = new AlphaVantageService();
    this.newsAPI = new NewsAPIService();
    this.redis = new Redis(process.env.REDIS_URL!);
  }

  // Get real-time quote for a symbol
  async getRealTimeQuote(symbol: string): Promise<Quote> {
    const cacheKey = `quote:${symbol}:realtime`;
    
    // Check cache first (5-second cache for real-time data)
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    try {
      // Try Polygon first (more reliable for real-time)
      const polygonQuote = await this.polygon.getQuote(symbol);
      
      const quote: Quote = {
        symbol: polygonQuote.symbol,
        price: polygonQuote.last.price,
        change: polygonQuote.last.price - polygonQuote.prevClose,
        changePercent: ((polygonQuote.last.price - polygonQuote.prevClose) / polygonQuote.prevClose) * 100,
        volume: polygonQuote.last.size,
        timestamp: new Date(polygonQuote.last.timestamp),
        bid: polygonQuote.last.bidPrice,
        ask: polygonQuote.last.askPrice,
        high: polygonQuote.day.h,
        low: polygonQuote.day.l,
        open: polygonQuote.day.o,
        previousClose: polygonQuote.prevClose
      };
      
      // Cache for 5 seconds
      await this.redis.setex(cacheKey, 5, JSON.stringify(quote));
      
      return quote;
    } catch (error) {
      console.warn(`Polygon failed for ${symbol}, falling back to Alpha Vantage`);
      
      // Fallback to Alpha Vantage
      const avQuote = await this.alphaVantage.getQuote(symbol);
      
      const quote: Quote = {
        symbol: symbol,
        price: parseFloat(avQuote['05. price']),
        change: parseFloat(avQuote['09. change']),
        changePercent: parseFloat(avQuote['10. change percent'].replace('%', '')),
        volume: parseInt(avQuote['06. volume']),
        timestamp: new Date(avQuote['07. latest trading day']),
        high: parseFloat(avQuote['03. high']),
        low: parseFloat(avQuote['04. low']),
        open: parseFloat(avQuote['02. open']),
        previousClose: parseFloat(avQuote['08. previous close'])
      };
      
      // Cache for 30 seconds (Alpha Vantage has lower rate limits)
      await this.redis.setex(cacheKey, 30, JSON.stringify(quote));
      
      return quote;
    }
  }

  // Get batch quotes
  async getBatchQuotes(symbols: string[]): Promise<Quote[]> {
    const cacheKey = `quotes:batch:${symbols.sort().join(',')}`;
    
    // Check cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Process in batches to respect rate limits
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      batches.push(symbols.slice(i, i + batchSize));
    }
    
    const allQuotes: Quote[] = [];
    
    for (const batch of batches) {
      try {
        const polygonQuotes = await this.polygon.getBatchQuotes(batch);
        allQuotes.push(...polygonQuotes);
      } catch (error) {
        console.warn('Polygon batch failed, falling back to individual requests');
        
        // Fallback to individual requests
        const batchQuotes = await Promise.all(
          batch.map(symbol => 
            this.getRealTimeQuote(symbol).catch(err => null)
          )
        );
        
        allQuotes.push(...batchQuotes.filter(q => q !== null) as Quote[]);
      }
      
      // Delay between batches
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Cache for 10 seconds
    await this.redis.setex(cacheKey, 10, JSON.stringify(allQuotes));
    
    return allQuotes;
  }

  // Get historical data
  async getHistoricalData(
    symbol: string, 
    interval: 'minute' | 'hour' | 'day' = 'day', 
    days: number = 100
  ): Promise<HistoricalData[]> {
    const cacheKey = `historical:${symbol}:${interval}:${days}`;
    
    // Check cache first (cache historical data for longer)
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    try {
      let data: HistoricalData[];
      
      if (interval === 'minute') {
        data = await this.polygon.getAggregates(symbol, 'minute', days);
      } else if (interval === 'hour') {
        data = await this.polygon.getAggregates(symbol, 'hour', days);
      } else {
        data = await this.alphaVantage.getDailyData(symbol, days);
      }
      
      // Cache for 1 hour for daily data, 5 minutes for intraday
      const ttl = interval === 'day' ? 3600 : 300;
      await this.redis.setex(cacheKey, ttl, JSON.stringify(data));
      
      return data;
    } catch (error) {
      console.error(`Error getting historical data for ${symbol}:`, error);
      throw error;
    }
  }

  // Get market news
  async getMarketNews(limit: number = 20): Promise<MarketNews[]> {
    const cacheKey = `news:market:${limit}`;
    
    // Check cache first (5 minute cache for news)
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    try {
      const news = await this.newsAPI.getMarketNews(limit);
      
      // Enhance with sentiment analysis
      const newsWithSentiment = await Promise.all(
        news.map(async (article) => ({
          ...article,
          ...await this.analyzeNewsSentiment(article)
        }))
      );
      
      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, JSON.stringify(newsWithSentiment));
      
      return newsWithSentiment;
    } catch (error) {
      console.error('Error fetching market news:', error);
      return [];
    }
  }

  // Get market overview
  async getMarketOverview(): Promise<MarketOverview> {
    const cacheKey = 'market:overview';
    
    // Check cache first (1 minute cache)
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    try {
      // Get multiple market indicators
      const [sp500, nasdaq, dow, vixData] = await Promise.all([
        this.getRealTimeQuote('SPY'),
        this.getRealTimeQuote('QQQ'),
        this.getRealTimeQuote('DIA'),
        this.getVIXData()
      ]);
      
      const overview: MarketOverview = {
        fearGreedIndex: await this.calculateFearGreedIndex(),
        marketStatus: await this.getMarketStatus(),
        sp500Change: sp500.changePercent,
        nasdaqChange: nasdaq.changePercent,
        dowJonesChange: dow.changePercent,
        vix: vixData.price,
        putCallRatio: await this.getPutCallRatio()
      };
      
      // Cache for 1 minute
      await this.redis.setex(cacheKey, 60, JSON.stringify(overview));
      
      return overview;
    } catch (error) {
      console.error('Error getting market overview:', error);
      
      // Return default overview on error
      return {
        fearGreedIndex: 50,
        marketStatus: 'closed',
        sp500Change: 0,
        nasdaqChange: 0,
        dowJonesChange: 0,
        vix: 20,
        putCallRatio: 0.8
      };
    }
  }

  // Get sector performance
  async getSectorPerformance(): Promise<Record<string, number>> {
    const cacheKey = 'market:sectors';
    
    // Check cache first (5 minute cache)
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    try {
      // Use sector ETFs to gauge performance
      const sectorETFs = {
        'Technology': 'XLK',
        'Financials': 'XLF',
        'Healthcare': 'XLV',
        'Consumer Discretionary': 'XLY',
        'Consumer Staples': 'XLP',
        'Energy': 'XLE',
        'Industrials': 'XLI',
        'Materials': 'XLB',
        'Utilities': 'XLU',
        'Real Estate': 'XLRE',
        'Communication Services': 'XLC'
      };
      
      const quotes = await this.getBatchQuotes(Object.values(sectorETFs));
      
      const performance: Record<string, number> = {};
      
      quotes.forEach(quote => {
        const sector = Object.entries(sectorETFs).find(([s, etf]) => etf === quote.symbol)?.[0];
        if (sector) {
          performance[sector] = quote.changePercent;
        }
      });
      
      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, JSON.stringify(performance));
      
      return performance;
    } catch (error) {
      console.error('Error getting sector performance:', error);
      return {};
    }
  }

  // Get all available symbols
  async getAllSymbols(): Promise<string[]> {
    const cacheKey = 'symbols:all';
    
    // Check cache first (24 hour cache for symbol list)
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    try {
      // Get symbols from Polygon
      const symbols = await this.polygon.getAllSymbols();
      
      // Filter for common stocks (remove ETFs, etc.)
      const commonStocks = symbols.filter(s => 
        !s.includes('.') && 
        !s.includes('/') &&
        s.length <= 5
      ).slice(0, 5000); // Limit to 5000 symbols
      
      // Cache for 24 hours
      await this.redis.setex(cacheKey, 86400, JSON.stringify(commonStocks));
      
      return commonStocks;
    } catch (error) {
      console.error('Error getting all symbols:', error);
      
      // Return default symbols on error
      return ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'JNJ', 'V'];
    }
  }

  // Get options data for a symbol
  async getOptionsData(symbol: string): Promise<any> {
    const cacheKey = `options:${symbol}`;
    
    // Check cache first (15 minute cache)
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    try {
      const options = await this.polygon.getOptionsChain(symbol);
      
      // Cache for 15 minutes
      await this.redis.setex(cacheKey, 900, JSON.stringify(options));
      
      return options;
    } catch (error) {
      console.error(`Error getting options data for ${symbol}:`, error);
      return null;
    }
  }

  // Get analyst recommendations
  async getAnalystRecommendations(symbol: string): Promise<any> {
    try {
      return await this.alphaVantage.getAnalystRecommendations(symbol);
    } catch (error) {
      console.error(`Error getting analyst recommendations for ${symbol}:`, error);
      return null;
    }
  }

  // Private helper methods
  private async analyzeNewsSentiment(article: any): Promise<{sentiment?: string; sentimentScore?: number}> {
    // Simple keyword-based sentiment analysis
    // In production, use NLP API like OpenAI or AWS Comprehend
    
    const text = `${article.title} ${article.description}`.toLowerCase();
    
    const positiveWords = ['bullish', 'gain', 'profit', 'growth', 'positive', 'strong', 'beat', 'upgrade'];
    const negativeWords = ['bearish', 'loss', 'decline', 'negative', 'weak', 'miss', 'downgrade', 'warning'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      if (text.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
      if (text.includes(word)) negativeCount++;
    });
    
    if (positiveCount > negativeCount) {
      return { sentiment: 'positive', sentimentScore: positiveCount / (positiveCount + negativeCount) };
    } else if (negativeCount > positiveCount) {
      return { sentiment: 'negative', sentimentScore: negativeCount / (positiveCount + negativeCount) };
    } else {
      return { sentiment: 'neutral', sentimentScore: 0 };
    }
  }

  private async getVIXData(): Promise<Quote> {
    try {
      return await this.getRealTimeQuote('VIX');
    } catch (error) {
      console.warn('Failed to get VIX data, using default');
      return {
        symbol: 'VIX',
        price: 20,
        change: 0,
        changePercent: 0,
        volume: 0,
        timestamp: new Date()
      };
    }
  }

  private async calculateFearGreedIndex(): Promise<number> {
    // Simplified calculation
    // In production, use actual CNN Fear & Greed Index or calculate from market data
    
    try {
      const vix = await this.getVIXData();
      const sp500 = await this.getRealTimeQuote('SPY');
      
      // Simple formula: lower VIX and positive SPY = higher greed
      let index = 50;
      
      if (vix.price < 15) index += 20;
      if (vix.price > 30) index -= 20;
      
      if (sp500.changePercent > 1) index += 15;
      if (sp500.changePercent < -1) index -= 15;
      
      return Math.max(0, Math.min(100, index));
    } catch (error) {
      return 50; // Neutral
    }
  }

  private async getMarketStatus(): Promise<'open' | 'closed' | 'pre' | 'post'> {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    // Simple market hours check
    // 9:30 AM - 4:00 PM ET, Monday-Friday
    const isWeekday = day >= 1 && day <= 5;
    const isPreMarket = hour >= 4 && hour < 9; // 4 AM - 9 AM ET
    const isMarketHours = hour >= 9 && hour < 16; // 9 AM - 4 PM ET
    const isPostMarket = hour >= 16 && hour < 20; // 4 PM - 8 PM ET
    
    if (!isWeekday) return 'closed';
    if (isPreMarket) return 'pre';
    if (isMarketHours) return 'open';
    if (isPostMarket) return 'post';
    
    return 'closed';
  }

  private async getPutCallRatio(): Promise<number> {
    // Simplified calculation
    // In production, fetch actual put/call ratio data
    
    try {
      const spyPutVolume = await this.getOptionsVolume('SPY', 'put');
      const spyCallVolume = await this.getOptionsVolume('SPY', 'call');
      
      if (spyCallVolume === 0) return 0;
      
      return spyPutVolume / spyCallVolume;
    } catch (error) {
      return 0.8; // Default ratio
    }
  }

  private async getOptionsVolume(symbol: string, optionType: 'call' | 'put'): Promise<number> {
    try {
      const options = await this.getOptionsData(symbol);
      if (!options) return 0;
      
      const relevantOptions = options.filter((opt: any) => 
        opt.type === optionType && 
        opt.expiration > new Date() &&
        Math.abs(opt.strike - (await this.getRealTimeQuote(symbol)).price) / (await this.getRealTimeQuote(symbol)).price < 0.1
      );
      
      return relevantOptions.reduce((sum: number, opt: any) => sum + opt.volume, 0);
    } catch (error) {
      return 0;
    }
  }

  // Stream real-time data (WebSocket)
  async streamRealTimeData(
    symbols: string[], 
    callback: (quote: Quote) => void
  ): Promise<() => void> {
    // Connect to Polygon WebSocket
    return this.polygon.streamQuotes(symbols, callback);
  }
}