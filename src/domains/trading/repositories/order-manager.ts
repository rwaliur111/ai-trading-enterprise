
#### **2. Create Missing Core Domain Files**

**src/domains/trading/repositories/order-manager.ts**
```typescript
import { Order } from '../entities/trade';
import { supabase } from '@/infrastructure/database/supabase-client';

export class OrderManager {
  async executeOrder(orderData: {
    symbol: string;
    type: 'MARKET' | 'LIMIT' | 'STOP';
    side: 'BUY' | 'SELL';
    quantity: number;
    price?: number;
    timeInForce?: 'GTC' | 'IOC' | 'FOK';
  }): Promise<Order> {
    try {
      // In a real implementation, this would call Alpaca API
      // For now, we'll simulate order execution
      
      const order: Order = {
        id: this.generateOrderId(),
        symbol: orderData.symbol,
        type: orderData.type,
        side: orderData.side,
        quantity: orderData.quantity,
        price: orderData.price,
        status: 'FILLED', // Simulate immediate fill for market orders
        filledQuantity: orderData.quantity,
        filledPrice: orderData.price || await this.getCurrentPrice(orderData.symbol),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      const { error } = await supabase
        .from('orders')
        .insert({
          symbol: order.symbol,
          type: order.type,
          side: order.side,
          quantity: order.quantity,
          price: order.price,
          status: order.status,
          filled_quantity: order.filledQuantity,
          filled_price: order.filledPrice
        });

      if (error) {
        throw new Error(`Failed to save order: ${error.message}`);
      }

      console.log(`Order ${order.id} executed for ${order.symbol}`);
      return order;

    } catch (error) {
      console.error('Error executing order:', error);
      throw error;
    }
  }

  async getOrderStatus(orderId: string): Promise<Order> {
    // Implementation to get order status from broker
    throw new Error('Not implemented');
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    // Implementation to cancel order
    throw new Error('Not implemented');
  }

  private generateOrderId(): string {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getCurrentPrice(symbol: string): Promise<number> {
    // Mock implementation - replace with real market data
    const mockPrices: { [key: string]: number } = {
      'AAPL': 150.25,
      'GOOGL': 2750.80,
      'MSFT': 330.45,
      'TSLA': 240.60
    };
    
    return mockPrices[symbol] || 100.00;
  }
}