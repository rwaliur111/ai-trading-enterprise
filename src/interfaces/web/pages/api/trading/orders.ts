import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Mock orders for testing
  const mockOrders = {
    orders: [
      {
        id: 'mock-order-1',
        symbol: 'AAPL',
        side: 'buy',
        type: 'market',
        quantity: 10,
        filled_quantity: 10,
        filled_price: 152.50,
        status: 'filled',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'mock-order-2',
        symbol: 'MSFT',
        side: 'sell',
        type: 'limit',
        quantity: 5,
        filled_quantity: 5,
        filled_price: 330.00,
        status: 'filled',
        created_at: new Date(Date.now() - 172800000).toISOString(),
        updated_at: new Date(Date.now() - 172800000).toISOString()
      }
    ],
    count: 2,
    timestamp: new Date().toISOString()
  }

  res.status(200).json(mockOrders)
}