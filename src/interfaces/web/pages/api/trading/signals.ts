import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Mock AI signals for testing
  const mockSignals = {
    signals: [
      {
        symbol: 'AAPL',
        action: 'BUY',
        confidence: 0.75,
        reason: 'Strong uptrend, RSI 65, MACD bullish crossover',
        price: 152.50,
        timestamp: new Date().toISOString(),
        indicators: {
          rsi: 65,
          macd: 0.5,
          moving_average_20: 150.25
        },
        risk_level: 'MEDIUM'
      },
      {
        symbol: 'MSFT',
        action: 'HOLD',
        confidence: 0.60,
        reason: 'Consolidating near resistance, neutral RSI',
        price: 330.00,
        timestamp: new Date().toISOString(),
        indicators: {
          rsi: 55,
          macd: 0.2,
          moving_average_20: 328.50
        },
        risk_level: 'LOW'
      }
    ],
    market_sentiment: {
      bullish: 0.6,
      bearish: 0.2,
      neutral: 0.2,
      top_bullish: ['AAPL'],
      top_bearish: []
    },
    timestamp: new Date().toISOString()
  }

  res.status(200).json(mockSignals)
}