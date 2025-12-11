import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { symbol } = req.query
  
  // Mock market data
  const mockQuote = {
    symbol: symbol || 'AAPL',
    price: 152.50 + (Math.random() - 0.5) * 2,
    change: 1.25,
    changePercent: 0.84,
    volume: 1250000,
    timestamp: new Date().toISOString(),
    high: 153.25,
    low: 151.75,
    open: 152.00
  }

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=59')
  res.status(200).json(mockQuote)
}