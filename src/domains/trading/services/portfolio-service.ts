import { Portfolio } from '../entities/portfolio';
import { Position } from '../entities/trade';
import { TradingRepository } from '../repositories/trading-repository';
import { PositionManager } from './position-manager';

export class PortfolioService {
  private repository: TradingRepository;
  private positionManager: PositionManager;

  constructor(repository: TradingRepository, positionManager: PositionManager) {
    this.repository = repository;
    this.positionManager = positionManager;
  }

  async getPortfolio(portfolioId: string = 'default'): Promise<Portfolio> {
    const positions = await this.repository.getPositions();
    
    // Calculate portfolio values
    const cashBalance = 100000; // Mock cash balance
    const marketValue = positions.reduce((total, pos) => 
      total + (pos.quantity * pos.currentPrice), 0
    );
    const totalValue = cashBalance + marketValue;
    
    const dailyPL = this.calculateDailyPL(positions);
    const totalPL = positions.reduce((total, pos) => total + pos.realizedPL, 0);

    return {
      id: portfolioId,
      name: 'Trading Portfolio',
      cashBalance,
      marketValue,
      totalValue,
      positions,
      dailyPL,
      totalPL,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date()
    };
  }

  async updatePortfolioValue(portfolio: Portfolio): Promise<Portfolio> {
    // Update with current market prices
    const currentPrices = new Map<string, number>();
    
    // In real implementation, fetch current prices from market data service
    for (const position of portfolio.positions) {
      currentPrices.set(position.symbol, position.currentPrice);
    }

    const updatedPositions = await this.positionManager.calculateUnrealizedPL(
      portfolio.positions,
      currentPrices
    );

    const marketValue = updatedPositions.reduce((total, pos) => 
      total + (pos.quantity * pos.currentPrice), 0
    );

    return {
      ...portfolio,
      positions: updatedPositions,
      marketValue,
      totalValue: portfolio.cashBalance + marketValue,
      updatedAt: new Date()
    };
  }

  private calculateDailyPL(positions: Position[]): number {
    // Mock implementation - in real app, calculate based on previous day's close
    return positions.reduce((total, pos) => total + pos.unrealizedPL, 0) * 0.1;
  }
}