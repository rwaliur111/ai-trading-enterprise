// src/domains/risk-management/services/risk-manager.ts
import { TradeSignal } from '@/domains/trading/entities/trade';
import { Portfolio } from '@/domains/trading/entities/portfolio';

export interface RiskAssessment {
  approved: boolean;
  reason?: string;
  maxPositionSize?: number;
  suggestedQuantity?: number;
}

export class RiskManager {
  private maxPositionSize: number = 10000; // $10,000 per position
  private maxDailyLoss: number = 5000; // $5,000 daily loss limit
  private maxPortfolioRisk: number = 0.02; // 2% portfolio risk per trade

  async assessSignal(signal: TradeSignal, portfolio?: Portfolio): Promise<RiskAssessment> {
    // Basic validation
    if (signal.confidence < 0.7) {
      return { approved: false, reason: 'Confidence level too low' };
    }

    if (signal.quantity <= 0) {
      return { approved: false, reason: 'Invalid quantity' };
    }

    // Position size validation
    const positionValue = signal.price * signal.quantity;
    if (positionValue > this.maxPositionSize) {
      const suggestedQuantity = Math.floor(this.maxPositionSize / signal.price);
      return {
        approved: false,
        reason: 'Position size exceeds maximum limit',
        maxPositionSize: this.maxPositionSize,
        suggestedQuantity
      };
    }

    // Portfolio risk assessment
    if (portfolio) {
      const portfolioRisk = positionValue / portfolio.totalValue;
      if (portfolioRisk > this.maxPortfolioRisk) {
        return {
          approved: false,
          reason: 'Trade exceeds maximum portfolio risk'
        };
      }
    }

    return { approved: true };
  }

  async calculatePositionSize(signal: TradeSignal, portfolio: Portfolio): Promise<number> {
    const riskAmount = portfolio.totalValue * this.maxPortfolioRisk;
    const maxSharesByRisk = Math.floor(riskAmount / signal.price);
    const maxSharesByPosition = Math.floor(this.maxPositionSize / signal.price);
    
    return Math.min(maxSharesByRisk, maxSharesByPosition, signal.quantity);
  }
}
