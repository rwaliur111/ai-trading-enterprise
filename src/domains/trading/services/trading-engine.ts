// src/domains/trading/services/trading-engine.ts
import { TradeSignal, Order, Position } from '../entities/trade';
import { Portfolio } from '../entities/portfolio';
import { RiskManager } from '@/domains/risk-management/services/risk-manager';
import { OrderManager } from '../repositories/order-manager';

export class TradingEngine {
  private riskManager: RiskManager;
  private orderManager: OrderManager;
  private isRunning: boolean = false;

  constructor(
    riskManager: RiskManager,
    orderManager: OrderManager
  ) {
    this.riskManager = riskManager;
    this.orderManager = orderManager;
  }

  async processSignal(signal: TradeSignal): Promise<Order | null> {
    try {
      // Validate signal
      if (!this.validateSignal(signal)) {
        console.warn('Invalid signal received:', signal);
        return null;
      }

      // Risk assessment
      const riskAssessment = await this.riskManager.assessSignal(signal);
      if (!riskAssessment.approved) {
        console.warn('Signal rejected by risk management:', riskAssessment.reason);
        return null;
      }

      // Execute order
      const order = await this.orderManager.executeOrder({
        symbol: signal.symbol,
        type: signal.type,
        side: signal.action === 'BUY' ? 'BUY' : 'SELL',
        quantity: signal.quantity,
        price: signal.price,
        timeInForce: signal.timeInForce || 'GTC'
      });

      console.log(`Order executed: ${order.id} for ${signal.symbol}`);
      return order;

    } catch (error) {
      console.error('Error processing trading signal:', error);
      throw error;
    }
  }

  private validateSignal(signal: TradeSignal): boolean {
    return (
      signal.symbol &&
      signal.price > 0 &&
      signal.quantity > 0 &&
      signal.confidence >= 0 &&
      signal.confidence <= 1
    );
  }

  async start(): Promise<void> {
    this.isRunning = true;
    console.log('Trading engine started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('Trading engine stopped');
  }
}
