import { MultiSourceMarketData } from '@/infrastructure/external-apis/multi-source-market-data';
import { AIAgentOrchestrator } from '../services/ai-agent-orchestrator';
import { CacheManager } from '@/infrastructure/cache/cache-manager';
import { AnalysisResult } from '@/domain/entities/analysis-result';
import { TradeSignal } from '@/domain/entities/trade-signal';

export class AnalyzeMarketUseCase {
  private marketDataService: MultiSourceMarketData;
  private aiOrchestrator: AIAgentOrchestrator;
  private cache: CacheManager;

  constructor(
    marketDataService: MultiSourceMarketData,
    aiOrchestrator: AIAgentOrchestrator,
    cache: CacheManager
  ) {
    this.marketDataService = marketDataService;
    this.aiOrchestrator = aiOrchestrator;
    this.cache = cache;
  }

  async execute(symbol: string): Promise<{
    marketData: any;
    analysis: any;
    news: any;
    technicals: any;
    signals: TradeSignal[];
  }> {
    try {
      const cacheKey = `market-analysis-${symbol}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const marketData = await this.marketDataService.getMarketData(symbol);
      const analysis = await this.aiOrchestrator.analyze(marketData);
      const news = await this.aiOrchestrator.getNewsSentiment(symbol);
      const technicals = await this.aiOrchestrator.getTechnicalIndicators(symbol);
      
      const analysisResults: AnalysisResult[] = analysis.results || [];
      
      const signals: TradeSignal[] = analysisResults.map((result, index) => ({
        id: `signal-${Date.now()}-${index}`,
        symbol: result.symbol,
        action: result.recommendation,
        type: 'MARKET',
        price: result.priceTarget,
        quantity: 100,
        confidence: result.confidence,
        reasoning: result.reasoning,
        source: 'AI_ANALYSIS',
        timestamp: new Date()
      }));

      const result = {
        marketData,
        analysis,
        news,
        technicals,
        signals
      };

      this.cache.set(cacheKey, result, { ttl: 300 });

      return result;

    } catch (error) {
      console.error('Error in AnalyzeMarketUseCase:', error);
      throw new Error('Failed to analyze market');
    }
  }
}
