import { MarketDataService } from '@/domains/market-data/services/market-data-service';
import { TradingService } from '@/application/services/trading-service';
import { RiskManager } from '@/application/services/risk-manager';
import { AISignalGenerator } from '@/application/services/ai-signal-generator';  // Fixed path

export class AIAgentOrchestrator {
  private tradingService: TradingService;
  private riskManager: RiskManager;
  private aiSignalGenerator: AISignalGenerator;
  
  constructor() {
    this.tradingService = new TradingService();
    this.riskManager = new RiskManager();
    this.aiSignalGenerator = new AISignalGenerator();
  }
  
  async executeTradingCycle(): Promise<void> {
    try {
      console.log('Starting AI trading cycle...');
      
      // 1. Get market data
      const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
      const marketData = await MarketDataService.getQuotes(symbols);
      
      // 2. Generate AI signals
      const signals = await this.aiSignalGenerator.generateSignals(marketData);
      
      // 3. Apply risk management
      const filteredSignals = this.riskManager.filterSignals(signals);
      
      // 4. Execute trades for approved signals
      for (const signal of filteredSignals) {
        if (signal.confidence >= 0.7 && signal.action !== 'hold') {
          try {
            const order = await this.tradingService.placeOrder({
              symbol: signal.symbol,
              quantity: this.calculatePositionSize(signal),
              side: signal.action === 'buy' ? 'buy' : 'sell',
              type: 'market',
              timeInForce: 'day'
            });
            
            console.log(`Executed ${signal.action} order for ${signal.symbol}:`, order.id);
            
            // Record trade in database
            await this.recordTrade({
              orderId: order.id,
              symbol: signal.symbol,
              action: signal.action,
              quantity: order.qty || order.quantity,
              price: order.filled_avg_price || signal.price,
              confidence: signal.confidence,
              signalData: signal
            });
            
          } catch (tradeError) {
            console.error(`Failed to execute trade for ${signal.symbol}:`, tradeError);
          }
        }
      }
      
      console.log('AI trading cycle completed successfully.');
      
    } catch (error) {
      console.error('Error in trading cycle:', error);
      throw new Error('Failed to execute trading cycle');
    }
  }
  
  private calculatePositionSize(signal: any): number {
    const baseSize = 10; // Base position size
    const confidenceMultiplier = signal.confidence; // 0.0 to 1.0
    const riskAdjustedSize = Math.floor(baseSize * confidenceMultiplier);
    
    // Ensure minimum position size
    return Math.max(1, riskAdjustedSize);
  }
  
  private async recordTrade(tradeData: any): Promise<void> {
    // Implementation for recording trade in database
    // This would typically save to Supabase or another database
    console.log('Recording trade:', tradeData);
    
    // Placeholder - implement actual database recording
    // await supabase.from('trades').insert(tradeData);
  }
  
  async getTradingMetrics(): Promise<any> {
    try {
      const [portfolio, orders, marketData] = await Promise.all([
        this.tradingService.getPortfolio(),
        this.tradingService.getOrders(),
        MarketDataService.getQuotes(['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'])
      ]);
      
      const metrics = {
        portfolioValue: portfolio.total_market_value || 0,
        unrealizedPL: portfolio.total_unrealized_pl || 0,
        totalTrades: orders.length || 0,
        recentPerformance: this.calculatePerformance(orders),
        marketConditions: this.analyzeMarketConditions(marketData),
        lastCycleTime: new Date().toISOString()
      };
      
      return metrics;
    } catch (error) {
      console.error('Error getting trading metrics:', error);
      return {};
    }
  }
  
  private calculatePerformance(orders: any[]): any {
    const filledOrders = orders.filter(o => o.status === 'filled');
    const buyOrders = filledOrders.filter(o => o.side === 'buy');
    const sellOrders = filledOrders.filter(o => o.side === 'sell');
    
    return {
      totalTrades: filledOrders.length,
      buyCount: buyOrders.length,
      sellCount: sellOrders.length,
      successRate: this.calculateSuccessRate(filledOrders)
    };
  }
  
  private calculateSuccessRate(orders: any[]): number {
    // Simplified success rate calculation
    // In production, this would compare entry/exit prices
    if (orders.length === 0) return 0;
    
    const profitableTrades = orders.filter(order => {
      // Placeholder logic - implement actual P/L calculation
      return Math.random() > 0.5; // Random for example
    });
    
    return profitableTrades.length / orders.length;
  }
  
  private analyzeMarketConditions(marketData: any[]): any {
    const totalChange = marketData.reduce((sum, quote) => sum + (quote.change || 0), 0);
    const avgChange = totalChange / marketData.length;
    
    return {
      marketSentiment: avgChange >= 0 ? 'bullish' : 'bearish',
      averageChange: avgChange,
      volatility: this.calculateVolatility(marketData),
      timestamp: new Date().toISOString()
    };
  }
  
  private calculateVolatility(marketData: any[]): number {
    if (marketData.length === 0) return 0;
    
    const changes = marketData.map(q => Math.abs(q.change || 0));
    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    
    return avgChange;
  }
}