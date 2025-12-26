import { AlpacaService } from '@/infrastructure/brokers/alpaca-service';

export class PortfolioService {
  private alpacaService: AlpacaService;

  constructor() {
    this.alpacaService = new AlpacaService();
  }

  async getPortfolio(): Promise<any> {
    try {
      return await this.alpacaService.getPortfolio();
    } catch (error) {
      console.error('Error in PortfolioService.getPortfolio:', error);
      return {
        account_value: 0,
        buying_power: 0,
        cash: 0,
        positions: [],
        total_market_value: 0,
        total_unrealized_pl: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getPortfolioValue(): Promise<number> {
    const portfolio = await this.getPortfolio();
    return portfolio.total_market_value || 0;
  }

  async getPositions(): Promise<any[]> {
    const portfolio = await this.getPortfolio();
    return portfolio.positions || [];
  }

  async calculateRiskMetrics(): Promise<any> {
    const portfolio = await this.getPortfolio();
    const positions = portfolio.positions || [];
    
    const totalValue = portfolio.total_market_value || 1;
    const totalUnrealizedPL = portfolio.total_unrealized_pl || 0;
    
    const positionConcentration = positions.map((pos: any) => ({
      symbol: pos.symbol,
      concentration: ((pos.market_value || 0) / totalValue) * 100,
      unrealizedPLPercent: pos.unrealized_pl ? (pos.unrealized_pl / (pos.avg_entry_price * pos.qty)) * 100 : 0,
    }));

    return {
      totalValue,
      totalUnrealizedPL,
      returnPercent: (totalUnrealizedPL / (totalValue - totalUnrealizedPL)) * 100,
      positionConcentration,
      diversificationScore: this.calculateDiversificationScore(positions),
      riskLevel: this.calculateRiskLevel(positions, totalValue),
      timestamp: new Date().toISOString(),
    };
  }

  private calculateDiversificationScore(positions: any[]): number {
    if (positions.length === 0) return 100;
    
    const totalValue = positions.reduce((sum, pos) => sum + (pos.market_value || 0), 0);
    if (totalValue === 0) return 100;
    
    const concentrations = positions.map(pos => (pos.market_value || 0) / totalValue);
    const herfindahlIndex = concentrations.reduce((sum, conc) => sum + conc * conc, 0);
    
    return Math.max(0, 100 - (herfindahlIndex * 100));
  }

  private calculateRiskLevel(positions: any[], totalValue: number): string {
    if (positions.length === 0) return 'LOW';
    
    const avgPositionSize = totalValue / positions.length;
    const largePositions = positions.filter(pos => (pos.market_value || 0) > avgPositionSize * 2);
    
    if (largePositions.length > positions.length * 0.3) return 'HIGH';
    if (largePositions.length > positions.length * 0.1) return 'MEDIUM';
    return 'LOW';
  }
}