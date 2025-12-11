import { NextApiRequest, NextApiResponse } from 'next';
import { ExecuteTradeUseCase } from '@/application/use-cases/execute-trade';
import { TradingEngine } from '@/domains/trading/services/trading-engine';
import { RiskManager } from '@/domains/risk-management/services/risk-manager';
import { OrderManager } from '@/domains/trading/repositories/order-manager';
import { NotificationService } from '@/domains/notification/services/notification-service';
import { TradingRepository } from '@/domains/trading/repositories/trading-repository';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize dependencies (in production, use dependency injection)
    const riskManager = new RiskManager();
    const orderManager = new OrderManager();
    const tradingRepository = new TradingRepository();
    const notificationService = new NotificationService();
    
    const tradingEngine = new TradingEngine(riskManager, orderManager);
    const executeTradeUseCase = new ExecuteTradeUseCase(
      tradingEngine,
      notificationService,
      tradingRepository
    );

    const { symbol, action, quantity, price, type = 'MARKET' } = req.body;

    // Validate required fields
    if (!symbol || !action || !quantity || !price) {
      return res.status(400).json({ 
        error: 'Missing required fields: symbol, action, quantity, price' 
      });
    }

    // Create trade signal
    const signal = {
      id: `manual_${Date.now()}`,
      symbol,
      action: action.toUpperCase(),
      type: type.toUpperCase(),
      price: parseFloat(price),
      quantity: parseInt(quantity),
      confidence: 1.0, // Manual trade has full confidence
      timestamp: new Date(),
      source: 'MANUAL',
      reasoning: 'Manual trade execution'
    };

    // Execute trade
    const result = await executeTradeUseCase.execute(signal);

    if (result.success) {
      res.status(200).json({ 
        success: true, 
        order: result.order,
        message: 'Trade executed successfully' 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.error 
      });
    }

  } catch (error) {
    console.error('Error executing trade:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
