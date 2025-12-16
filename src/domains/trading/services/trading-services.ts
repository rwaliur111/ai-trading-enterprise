import { AlpacaService } from '../../../infrastructure/external-apis/alpaca-service';
import { AIAgentOrchestrator } from '../../../application/services/ai-agent-orchestrator';
import { RedisMonitor } from '../../../infrastructure/monitoring/redis-monitor';

export class TradingService {
  private alpaca: AlpacaService;
  private aiOrchestrator: AIAgentOrchestrator;
  private monitor: RedisMonitor;

  constructor() {
    this.alpaca = new AlpacaService();
    this.aiOrchestrator = new AIAgentOrchestrator();
    this.monitor = new RedisMonitor();
  }

  async executeTrade(symbol: string, side: 'buy' | 'sell', quantity: number) {
    // Validate trade size
    const maxSize = parseFloat(process.env.MAX_TRADE_SIZE || '10000');
    if (quantity > maxSize) {
      throw new Error(`Trade size exceeds maximum limit: ${maxSize}`);
    }

    // AI Analysis
    const analysis = await this.aiOrchestrator.analyzeOpportunity(symbol);
    
    if (!analysis.shouldTrade) {
      throw new Error(`Trade not approved by AI: Confidence ${analysis.confidence}`);
    }

    // Execute trade
    const order = await this.alpaca.placeOrder({
      symbol,
      qty: quantity,
      side,
      type: 'market',
      time_in_force: 'day'
    });

    // Record trade
    await this.monitor.recordTrade({
      id: order.id,
      symbol,
      side,
      quantity,
      price: order.filled_avg_price,
      ai_confidence: analysis.confidence,
      status: 'filled'
    });

    return order;
  }
}