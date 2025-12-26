import { AlpacaService } from '@/infrastructure/external-apis/alpaca-service';  // Fixed path
import { RiskManager } from '@/application/services/risk-manager';

export class TradingService {
  private alpacaService: AlpacaService;
  private riskManager: RiskManager;

  constructor() {
    this.alpacaService = new AlpacaService();
    this.riskManager = new RiskManager();
  }

  async placeOrder(orderParams: {
    symbol: string;
    quantity: number;
    side: 'buy' | 'sell';
    type: string;
    timeInForce: string;
    limitPrice?: number;
    stopPrice?: number;
  }): Promise<any> {
    try {
      // Check risk before placing order
      const riskApproved = await this.riskManager.validateOrder(orderParams);
      if (!riskApproved.approved) {
        throw new Error(`Order rejected by risk manager: ${riskApproved.reason}`);
      }

      // Place the order
      const order = await this.alpacaService.placeOrder(orderParams);
      
      // Record the trade
      await this.recordTrade({
        orderId: order.id,
        symbol: orderParams.symbol,
        side: orderParams.side,
        quantity: orderParams.quantity,
        price: orderParams.limitPrice || 0, // Will be updated when filled
        status: order.status,
        timestamp: new Date().toISOString(),
      });

      return order;
    } catch (error) {
      console.error('Error in TradingService.placeOrder:', error);
      throw error;
    }
  }

  async getOrders(): Promise<any[]> {
    try {
      return await this.alpacaService.getOrders();
    } catch (error) {
      console.error('Error in TradingService.getOrders:', error);
      return [];
    }
  }

  async getOrder(orderId: string): Promise<any> {
    try {
      const orders = await this.getOrders();
      return orders.find((order: any) => order.id === orderId);
    } catch (error) {
      console.error('Error in TradingService.getOrder:', error);
      return null;
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      // In a real implementation, you would call Alpaca's cancel order API
      console.log(`Canceling order ${orderId}`);
      return true;
    } catch (error) {
      console.error('Error in TradingService.cancelOrder:', error);
      return false;
    }
  }

  async getPortfolio(): Promise<any> {
    try {
      return await this.alpacaService.getPortfolio();
    } catch (error) {
      console.error('Error in TradingService.getPortfolio:', error);
      return {
        account_value: 0,
        buying_power: 0,
        cash: 0,
        positions: [],
        total_market_value: 0,
        total_unrealized_pl: 0,
      };
    }
  }

  private async recordTrade(tradeData: any): Promise<void> {
    // This would normally save to a database
    console.log('Recording trade:', tradeData);
    // Implement database recording here
  }
}