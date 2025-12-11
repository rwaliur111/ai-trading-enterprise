// Create src/interfaces/web/pages/api/trading/portfolio.ts
@'
import { NextApiRequest, NextApiResponse } from 'next'
import { AlpacaService } from '@/src/infrastructure/external-apis/alpaca-service'
import { MarketDataService } from '@/src/domains/market-data/services/market-data-service'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const alpacaService = new AlpacaService()
    const marketDataService = new MarketDataService()

    // Get account info
    const account = await alpacaService.getAccount()
    const positions = await alpacaService.getPositions()
    
    // Get current market prices for positions
    let totalPnL = 0
    let dailyPnL = 0
    
    const enrichedPositions = await Promise.all(
      positions.map(async (position: any) => {
        try {
          const quote = await marketDataService.getRealTimeQuote(position.symbol)
          const currentValue = parseFloat(position.qty) * quote.price
          const profitLoss = currentValue - parseFloat(position.market_value)
          
          totalPnL += profitLoss
          dailyPnL += parseFloat(position.unrealized_intraday_pl)
          
          return {
            symbol: position.symbol,
            quantity: parseFloat(position.qty),
            avgPrice: parseFloat(position.avg_entry_price),
            currentPrice: quote.price,
            currentValue,
            profitLoss,
            profitLossPercent: (profitLoss / parseFloat(position.market_value)) * 100
          }
        } catch (error) {
          console.error(`Error enriching position ${position.symbol}:`, error)
          return null
        }
      })
    )

    const portfolioData = {
      totalValue: parseFloat(account.portfolio_value),
      cash: parseFloat(account.cash),
      buyingPower: parseFloat(account.buying_power),
      dailyPnL,
      totalPnL,
      positions: enrichedPositions.filter(p => p !== null),
      accountNumber: account.account_number,
      status: account.status,
      lastUpdated: new Date().toISOString()
    }

    res.status(200).json({
      success: true,
      data: portfolioData,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error fetching portfolio:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch portfolio data' 
    })
  }
}
'@ | Set-Content -Path ".\src\interfaces\web\pages\api\trading\portfolio.ts" -Encoding UTF8