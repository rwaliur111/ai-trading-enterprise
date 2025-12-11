import { NextApiRequest, NextApiResponse } from 'next';
import { PortfolioService } from '@/domains/trading/services/portfolio-service';
import { TradingRepository } from '@/domains/trading/repositories/trading-repository';
import { PositionManager } from '@/domains/trading/services/position-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize services
    const tradingRepository = new TradingRepository();
    const positionManager = new PositionManager(tradingRepository);
    const portfolioService = new PortfolioService(tradingRepository, positionManager);

    // Get portfolio with positions
    const portfolio = await portfolioService.getPortfolio();

    res.status(200).json({ 
      portfolio,
      positions: portfolio.positions 
    });

  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}