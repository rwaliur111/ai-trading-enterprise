import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Mock portfolio data
  const portfolio = {
    account: {
      id: 'mock-account-id',
      account_number: 'MOCK12345678',
      status: 'ACTIVE',
      currency: 'USD',
      buying_power: 100000,
      cash: 50000,
      portfolio_value: 150000,
      equity: 150000,
      daytrade_count: 0,
      last_equity: 145000
    },
    summary: {
      total_positions: 2,
      total_market_value: 100000,
      total_cost_basis: 97500,
      total_unrealized_pl: 2500,
      total_unrealized_pl_percent: 2.56,
      cash_percentage: 33.33,
      invested_percentage: 66.67
    },
    positions: [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        quantity: 100,
        avg_entry_price: 150.25,
        current_price: 152.50,
        market_value: 15250,
        cost_basis: 15025,
        unrealized_pl: 225,
        unrealized_pl_percent: 1.50,
        day_pl: 25,
        day_pl_percent: 0.16,
        change_today: 0.25,
        weight: 15.25
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        exchange: 'NASDAQ',
        quantity: 50,
        avg_entry_price: 325.50,
        current_price: 330.00,
        market_value: 16500,
        cost_basis: 16275,
        unrealized_pl: 225,
        unrealized_pl_percent: 1.38,
        day_pl: 50,
        day_pl_percent: 0.30,
        change_today: 0.50,
        weight: 16.50
      }
    ],
    totalValue: 150000,
    cash: 50000,
    timestamp: new Date().toISOString()
  }

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=59')
  res.status(200).json(portfolio)
}