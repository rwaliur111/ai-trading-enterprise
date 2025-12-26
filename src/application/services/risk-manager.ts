export class RiskManager {
  private maxPositionSize: number;
  private maxDailyLoss: number;
  private maxSingleTradeRisk: number;

  constructor() {
    this.maxPositionSize = parseFloat(process.env.MAX_TRADE_SIZE || '10000');
    this.maxDailyLoss = 0.05; // 5% max daily loss
    this.maxSingleTradeRisk = parseFloat(process.env.RISK_PER_TRADE || '0.02'); // 2% per trade
  }

  async validateOrder(orderParams: {
    symbol: string;
    quantity: number;
    side: 'buy' | 'sell';
    type: string;
    limitPrice?: number;
    stopPrice?: number;
  }): Promise<{ approved: boolean; reason?: string }> {
    try {
      // Check 1: Position size limit
      const estimatedValue = await this.estimateOrderValue(orderParams);
      if (estimatedValue > this.maxPositionSize) {
        return {
          approved: false,
          reason: `Order size (${estimatedValue}) exceeds maximum position size (${this.maxPositionSize})`,
        };
      }

      // Check 2: Single trade risk
      const riskAmount = estimatedValue * this.maxSingleTradeRisk;
      if (riskAmount > estimatedValue * 0.1) {
        return {
          approved: false,
          reason: `Trade risk (${riskAmount}) exceeds allowed risk per trade`,
        };
      }

      // Check 3: Market hours (optional - you might want to trade after hours)
      const marketStatus = await this.checkMarketStatus();
      if (!marketStatus.isOpen && orderParams.type === 'market') {
        return {
          approved: false,
          reason: 'Market orders can only be placed during market hours',
        };
      }

      // All checks passed
      return { approved: true };
    } catch (error) {
      console.error('Error in risk validation:', error);
      return {
        approved: false,
        reason: 'Risk validation failed due to system error',
      };
    }
  }

  private async estimateOrderValue(orderParams: any): Promise<number> {
    // This would fetch current price from market data
    // For now, use a placeholder
    return orderParams.quantity * 100; // Assume $100 per share for estimation
  }

  private async checkMarketStatus(): Promise<{ isOpen: boolean; nextOpen?: string }> {
    // This would check actual market status
    // For now, assume market is open on weekdays 9:30-4:00 ET
    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = (hours > 9 || (hours === 9 && minutes >= 30)) && hours < 16;
    
    return {
      isOpen: isWeekday && isMarketHours,
      nextOpen: 'Next market open: Monday 9:30 AM ET',
    };
  }

  calculatePositionSize(
    accountSize: number,
    entryPrice: number,
    stopLossPrice: number
  ): number {
    const riskPerShare = Math.abs(entryPrice - stopLossPrice);
    const maxRiskAmount = accountSize * this.maxSingleTradeRisk;
    const positionSize = Math.floor(maxRiskAmount / riskPerShare);
    
    return Math.max(1, positionSize);
  }

  async getRiskMetrics(): Promise<any> {
    return {
      maxPositionSize: this.maxPositionSize,
      maxDailyLoss: this.maxDailyLoss,
      maxSingleTradeRisk: this.maxSingleTradeRisk,
      currentUtilization: 0, // This would be calculated based on current positions
      availableRiskCapital: this.maxPositionSize, // This would be dynamic
      timestamp: new Date().toISOString(),
    };
  }
}