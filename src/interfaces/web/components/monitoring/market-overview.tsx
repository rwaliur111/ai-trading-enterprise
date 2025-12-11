'use client'

import { useState, useEffect } from 'react'

export default function MarketOverview() {
  const [marketData, setMarketData] = useState<any[]>([])
  const [sentiment, setSentiment] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchMarketData()
    fetchSentiment()
  }, [])

  const fetchMarketData = async () => {
    try {
      const response = await fetch('/api/market-data/quotes?symbols=SPY,QQQ,DIA')
      const data = await response.json()
      setMarketData(data.quotes || [])
    } catch (error) {
      console.error('Error fetching market data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSentiment = async () => {
    try {
      const response = await fetch('/api/trading/signals?sentiment=true')
      const data = await response.json()
      setSentiment(data.market_sentiment)
    } catch (error) {
      console.error('Error fetching sentiment:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Overview</h3>
        
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-3">Major Indices</h4>
              <div className="space-y-3">
                {marketData.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{item.symbol}</div>
                      <div className="text-sm text-gray-500">Index</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${item.price?.toFixed(2)}</div>
                      <div className={`text-sm ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.change >= 0 ? '+' : ''}{item.change?.toFixed(2)} ({item.changePercent?.toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {sentiment && (
              <div>
                <h4 className="font-medium mb-3">Market Sentiment</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Bullish</span>
                    <span className="font-medium">{Math.round(sentiment.bullish * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${sentiment.bullish * 100}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm">Bearish</span>
                    <span className="font-medium">{Math.round(sentiment.bearish * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-600 h-2 rounded-full" 
                      style={{ width: `${sentiment.bearish * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-blue-50 rounded">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900">Market Open</p>
                  <p className="text-sm text-blue-700">NASDAQ: 9:30 AM - 4:00 PM ET</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}