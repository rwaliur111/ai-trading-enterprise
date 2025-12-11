import { Position } from '../entities/trade';
import { TradingRepository } from '../repositories/trading-repository';

export class PositionManager {
  private repository: TradingRepository;

  constructor(repository: TradingRepository) {
    this.repository = repository;
  }

  async updatePosition(
    symbol: string, 
    quantityChange: number, 
    price: number
  ): Promise<Position> {
    const existingPositions = await this.repository.getPositions();
    const existingPosition = existingPositions.find(p => p.symbol === symbol);

    if (existingPosition) {
      // Update existing position
      const newQuantity = existingPosition.quantity + quantityChange;
      
      if (newQuantity === 0) {
        // Position closed
        await this.closePosition(existingPosition.id);
        return existingPosition;
      }

      const newAveragePrice = this.calculateAveragePrice(
        existingPosition.quantity,
        existingPosition.averagePrice,
        quantityChange,
        price
      );

      const updatedPosition: Position = {
        ...existingPosition,
        quantity: newQuantity,
        averagePrice: newAveragePrice,
        currentPrice: price,
        lastUpdated: new Date()
      };

      await this.repository.savePosition(updatedPosition);
      return updatedPosition;

    } else if (quantityChange > 0) {
      // Create new position
      const newPosition: Position = {
        id: this.generatePositionId(),
        symbol,
        quantity: quantityChange,
        averagePrice: price,
        currentPrice: price,
        unrealizedPL: 0,
        realizedPL: 0,
        openedAt: new Date(),
        lastUpdated: new Date()
      };

      await this.repository.savePosition(newPosition);
      return newPosition;
    } else {
      throw new Error(`Cannot create position with negative quantity for ${symbol}`);
    }
  }

  async calculateUnrealizedPL(positions: Position[], currentPrices: Map<string, number>): Promise<Position[]> {
    return positions.map(position => {
      const currentPrice = currentPrices.get(position.symbol) || position.currentPrice;
      const unrealizedPL = (currentPrice - position.averagePrice) * position.quantity;
      
      return {
        ...position,
        currentPrice,
        unrealizedPL
      };
    });
  }

  private calculateAveragePrice(
    existingQuantity: number,
    existingAveragePrice: number,
    newQuantity: number,
    newPrice: number
  ): number {
    const totalValue = (existingQuantity * existingAveragePrice) + (newQuantity * newPrice);
    const totalQuantity = existingQuantity + newQuantity;
    
    return totalValue / totalQuantity;
  }

  private async closePosition(positionId: string): Promise<void> {
    // Implementation to close position
    console.log(`Closing position ${positionId}`);
  }

  private generatePositionId(): string {
    return `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
