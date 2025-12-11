// Create src/interfaces/web/pages/api/market-data/quotes.ts
@'
import { NextApiRequest, NextApiResponse } from 'next'
import { MarketDataService } from '@/src/domains/market-data/services/market-data-service'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { symbols } = req.query
    const marketDataService = new MarketDataService()
    
    let symbolList: string[]
    if (Array.isArray(symbols)) {
      symbolList = symbols
    } else if (typeof symbols === 'string') {
      symbolList = symbols.split(',')
    } else {
      symbolList = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA']
    }

    const quotes = await marketDataService.getMultipleQuotes(symbolList)

    res.status(200).json({
      success: true,
      data: quotes,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error fetching market quotes:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch market data' 
    })
  }
}
'@ | Set-Content -Path ".\src\interfaces\web\pages\api\market-data\quotes.ts" -Encoding UTF8