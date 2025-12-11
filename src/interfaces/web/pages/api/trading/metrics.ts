import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Mock trading metrics for testing
  const mockMetrics = {
    summary: {
      total_trades: 45,
      winning_trades: 28,
      losing_trades: 15,
      breakeven_trades: 2,
      win_rate: 62.22,
      total_profit: 12500.50,
      total_volume: 450000.75,
      average_profit: 277.79,
      profit_factor: 1.85,
      timestamp: new Date().toISOString()
    },
    risk_metrics: {
      volatility: 0.025,
      sharpe_ratio: 1.42,
      max_drawdown: -0.085,
      var_95: -0.035
    },
    portfolio: {
      current_value: 150000,
      cash_balance: 50000,
      invested_value: 100000,
      daily_pl: 1250.50,
      daily_pl_percent: 0.84,
      positions_count: 8
    }
  }

  res.status(200).json(mockMetrics)
}