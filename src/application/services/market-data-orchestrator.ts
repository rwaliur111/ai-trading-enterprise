import { AlphaVantageService } from '@/infrastructure/external-apis/alpha-vantage-service';
import { PolygonService } from '@/infrastructure/external-apis/polygon-service';
import { FinnhubService } from '@/infrastructure/external-apis/finnhub-service';

export class MarketDataOrchestrator {
  private alphaVantage: AlphaVantageService;
  private polygon: PolygonService;
  private finnhub: FinnhubService;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_TTL = 30000; // 30 seconds

  constructor() {
    this.alphaVantage = new AlphaVantageService();
    this.polygon = new PolygonService();
    this.finnhub = new FinnhubService();
  }

  async getRealTimeData(symbols: string[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    const now = Date.now();
    
    // Batch process symbols
    const batchSize = 5; // Respect API rate limits
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const promises = batch.map(symbol => this.getSymbolData(symbol, now));
      const batchResults = await Promise.all(promises);
      
      batchResults.forEach((data, index) => {
        if (data) {
          results[batch[index]] = data;
        }
      });
      
      // Rate limiting delay
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  private async getSymbolData(symbol: string, timestamp: number): Promise<any> {
    // Check cache first
    const cached = this.cache.get(symbol);
    if (cached && (timestamp - cached.timestamp) < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // Get data from multiple sources in parallel
      const [quote, news, technicals] = await Promise.all([
        this.getBestQuote(symbol),
        this.getNews(symbol),
        this.getTechnicalIndicators(symbol)
      ]);

      const data = {
        symbol,
        quote,
        news,
        technicals,
        timestamp: Date.now(),
        sources: ['alpha_vantage', 'polygon', 'finnhub']
      };

      // Update cache
      this.cache.set(symbol, { data, timestamp: Date.now() });
      
      return data;
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
      return null;
    }
  }

  private async getBestQuote(symbol: string): Promise<any> {
    // Try multiple sources, fallback chain
    try {
      // Try Polygon first (most reliable for real-time)
      const polygonData = await this.polygon.getLastQuote(symbol);
      if (polygonData && polygonData.last && polygonData.last.price) {
        return polygonData;
      }
    } catch (error) {
      console.log(`Polygon failed for ${symbol}, trying Alpha Vantage`);
    }

    try {
      // Fallback to Alpha Vantage
      return await this.alphaVantage.getRealTimeQuote(symbol);
    } catch (error) {
      console.log(`Alpha Vantage failed for ${symbol}, trying Finnhub`);
    }

    try {
      // Final fallback
      return await this.finnhub.getQuote(symbol);
    } catch (error) {
      throw new Error(`All quote sources failed for ${symbol}`);
    }
  }

  async getNews(symbol: string, limit: number = 10): Promise<any[]> {
    try {
      return await this.finnhub.getCompanyNews(symbol, '2024-01-01', '2024-01-10', limit);
    } catch (error) {
      console.error(`News error for ${symbol}:`, error);
      return [];
    }
  }

  async getTechnicalIndicators(symbol: string): Promise<any> {
    try {
      const [rsi, macd, sma] = await Promise.all([
        this.polygon.getRSI(symbol),
        this.polygon.getMACD(symbol),
        this.polygon.getSMA(symbol)
      ]);
      
      return { rsi, macd, sma };
    } catch (error) {
      return { rsi: 50, macd: 'neutral', sma: 0 };
    }
  }

  // Real-time streaming with WebSockets
  async streamMarketData(symbols: string[], callback: (data: any) => void) {
    // This would connect to WebSocket streams
    // Implementation depends on your broker/API
    console.log(`Starting real-time stream for: ${symbols.join(', ')}`);
    
    // Mock implementation - in production use actual WebSocket
    setInterval(async () => {
      const data = await this.getRealTimeData(symbols);
      callback(data);
    }, 10000); // Update every 10 seconds
  }
}
