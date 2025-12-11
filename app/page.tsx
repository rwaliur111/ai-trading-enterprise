'use client'

import { useEffect, useState } from 'react'
// Import from the correct path (without extra "src/")
import TradingDashboard from '@/interfaces/web/components/trading/trading-dashboard'
import MarketOverview from '@/interfaces/web/components/monitoring/market-overview'

export default function Home() {
  const [marketData, setMarketData] = useState<any>(null)
  const [portfolio, setPortfolio] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [marketRes, portfolioRes] = await Promise.all([
          fetch('/api/market-data/quotes?symbol=AAPL'),
          fetch('/api/trading/portfolio')
        ])
        
        if (marketRes.ok) {
          const marketData = await marketRes.json()
          setMarketData(marketData)
        }
        
        if (portfolioRes.ok) {
          const portfolioData = await portfolioRes.json()
          setPortfolio(portfolioData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Trading Enterprise</h1>
        <p className="text-gray-600">Real-time AI-powered trading platform</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading trading data...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <TradingDashboard 
              marketData={marketData}
              portfolio={portfolio}
            />
          </div>
          <div>
            <MarketOverview />
          </div>
        </div>
      )}
    </div>
  )
}