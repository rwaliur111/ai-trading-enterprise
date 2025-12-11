import { TradeSignal, Order } from '@/domains/trading/entities/trade';
import { TradingEngine } from '@/domains/trading/services/trading-engine';
import { RiskManager } from '@/domains/risk-management/services/risk-manager';
import { OrderManager } from '@/domains/trading/repositories/order-manager';
import { TradingRepository } from '@/domains/trading/repositories/trading-repository';
import { NotificationService } from '@/domains/notification/services/notification-service';

export class ExecuteTradeUseCase {
  private tradingEngine: TradingEngine;
  private notificationService: NotificationService;
  private tradingRepository: TradingRepository;

  constructor(
    tradingEngine: TradingEngine,
    notificationService: NotificationService,
    tradingRepository: TradingRepository
  ) {
    this.tradingEngine = tradingEngine;
    this.notificationService = notificationService;
    this.tradingRepository = tradingRepository;
  }

  async execute(signal: TradeSignal): Promise<{ success: boolean; order?: Order; error?: string }> {
    try {
      console.log(`Executing trade for ${signal.symbol}: ${signal.action} ${signal.quantity} @ $${signal.price}`);

      // Save the signal first
      await this.tradingRepository.saveSignal(signal);

      // Execute through trading engine
      const order = await this.tradingEngine.processSignal(signal);

      if (order) {
        // Send notification
        await this.notificationService.sendTradeExecution({
          symbol: signal.symbol,
          action: signal.action,
          quantity: signal.quantity,
          price: signal.price,
          orderId: order.id,
          confidence: signal.confidence
        });

        return { success: true, order };
      } else {
        return { success: false, error: 'Trade was rejected by risk management' };
      }

    } catch (error) {
      console.error('Error executing trade:', error);
      
      // Send error notification
      await this.notificationService.sendError({
        context: 'trade_execution',
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol: signal.symbol
      });

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
}