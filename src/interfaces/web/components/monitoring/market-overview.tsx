// Update src/interfaces/web/components/monitoring/market-overview.tsx
@'
"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

interface MarketQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  timestamp: string
}

export default function MarketOverview() {
  const [quotes, setQuotes] = useState<MarketQuote[]>([])
  const [aiMetrics, setAiMetrics] = useState({
    confidence: 0,
    signalsToday: 0,
    winRate: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadMarketData()
    const interval = setInterval(loadMarketData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadMarketData = async () => {
    setIsLoading(true)
    try {
      // Fetch market quotes
      const quotesRes = await fetch('/api/market-data/quotes')
      const quotesData = await quotesRes.json()
      setQuotes(quotesData.data)

      // Fetch AI metrics
      const metricsRes = await fetch('/api/trading/metrics')
      const metricsData = await metricsRes.json()
      setAiMetrics(metricsData.data)
    } catch (error) {
      console.error('Error loading market data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Market Overview</CardTitle>
          <CardDescription>Loading market data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-800/50 animate-pulse rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle>Market Overview</CardTitle>
        <CardDescription>Real-time market indicators</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {quotes.slice(0, 5).map((quote) => (
            <div key={quote.symbol} className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg hover:bg-gray-800/50 transition-colors">
              <div>
                <p className="font-medium">{quote.symbol}</p>
                <p className="text-sm text-gray-400">${quote.price.toFixed(2)}</p>
              </div>
              <div className={`text-right ${quote.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                <p className="font-medium">
                  {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)}
                </p>
                <p className="text-sm">
                  ({quote.change >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%)
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-800">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">AI Confidence:</span>
            <span className="text-green-400 font-medium">
              {(aiMetrics.confidence * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-gray-400">Signals Today:</span>
            <span className="font-medium">{aiMetrics.signalsToday}</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-gray-400">Win Rate:</span>
            <span className="text-green-400 font-medium">
              {(aiMetrics.winRate * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        <button
          onClick={loadMarketData}
          className="mt-4 w-full py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          Refresh Data
        </button>
      </CardContent>
    </Card>
  )
}
'@ | Set-Content -Path ".\src\interfaces\web\components\monitoring\market-overview.tsx" -Encoding UTF8