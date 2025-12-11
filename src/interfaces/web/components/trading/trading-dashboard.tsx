// Update src/interfaces/web/components/trading/trading-dashboard.tsx
@'
"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TradingSignal } from '@/src/application/services/ai-agent-orchestrator'

interface PortfolioData {
  totalValue: number
  cash: number
  buyingPower: number
  dailyPnL: number
  totalPnL: number
  positions: Array<{
    symbol: string
    quantity: number
    avgPrice: number
    currentValue: number
    profitLoss: number
  }>
}

export default function TradingDashboard() {
  const [isTradingActive, setIsTradingActive] = useState(false)
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null)
  const [tradingSignals, setTradingSignals] = useState<TradingSignal[]>([])
  const [priceHistory, setPriceHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(loadDashboardData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      // Fetch portfolio data
      const portfolioRes = await fetch('/api/trading/portfolio')
      const portfolio = await portfolioRes.json()
      setPortfolioData(portfolio.data)

      // Fetch trading signals
      const signalsRes = await fetch('/api/trading/signals')
      const signals = await signalsRes.json()
      setTradingSignals(signals.data)

      // Fetch price history (for AAPL as example)
      const historyRes = await fetch('/api/market-data/history?symbol=AAPL')
      const history = await historyRes.json()
      setPriceHistory(history.data)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const executeTrade = async (symbol: string, action: 'BUY' | 'SELL', quantity: number) => {
    try {
      const response = await fetch('/api/trading/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol,
          action,
          quantity,
          type: 'MARKET',
          timeInForce: 'DAY'
        })
      })
      
      const result = await response.json()
      if (result.success) {
        alert(`Trade executed: ${action} ${quantity} ${symbol}`)
        loadDashboardData() // Refresh data
      } else {
        alert(`Trade failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Error executing trade:', error)
      alert('Failed to execute trade')
    }
  }

  const toggleTrading = async () => {
    const newState = !isTradingActive
    setIsTradingActive(newState)
    
    try {
      await fetch('/api/trading/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: newState })
      })
    } catch (error) {
      console.error('Error toggling trading:', error)
    }
  }

  if (isLoading) {
    return (
      <Card className="glass-effect">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading trading data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle>Trading Dashboard</CardTitle>
        <CardDescription>Real-time AI-powered trading interface</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">Portfolio Value</p>
            <p className="text-2xl font-bold text-green-400">
              ${portfolioData?.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">Daily P&L</p>
            <p className={`text-2xl font-bold ${(portfolioData?.dailyPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${(portfolioData?.dailyPnL || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">Available Cash</p>
            <p className="text-2xl font-bold text-blue-400">
              ${portfolioData?.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">AI Trading Status</p>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isTradingActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <p className="text-lg">{isTradingActive ? 'Active' : 'Paused'}</p>
            </div>
          </div>
        </div>

        {/* Price Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={priceHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="timestamp" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                labelStyle={{ color: '#D1D5DB' }}
                formatter={(value) => [`$${value}`, 'Price']}
              />
              <Line 
                type="monotone" 
                dataKey="close" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Trading Signals */}
        <div>
          <h3 className="text-lg font-semibold mb-3">AI Trading Signals</h3>
          <div className="space-y-3">
            {tradingSignals.slice(0, 3).map((signal) => (
              <div key={signal.symbol} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{signal.symbol}</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      signal.action === 'BUY' ? 'bg-green-900 text-green-300' :
                      signal.action === 'SELL' ? 'bg-red-900 text-red-300' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {signal.action}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{signal.reasoning.slice(0, 80)}...</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${
                      signal.confidence > 0.8 ? 'text-green-400' :
                      signal.confidence > 0.6 ? 'text-yellow-400' : 'text-gray-400'
                    }`}>
                      {(signal.confidence * 100).toFixed(0)}%
                    </span>
                    <Button 
                      size="sm"
                      onClick={() => executeTrade(signal.symbol, signal.action, 10)}
                      disabled={!isTradingActive}
                    >
                      Execute
                    </Button>
                  </div>
                  <p className="text-sm text-gray-400">Target: ${signal.priceTarget.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Control Panel */}
        <div className="flex gap-4">
          <Button 
            onClick={toggleTrading}
            className={isTradingActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
          >
            {isTradingActive ? 'Pause AI Trading' : 'Start AI Trading'}
          </Button>
          <Button variant="outline" onClick={loadDashboardData}>
            Refresh Data
          </Button>
          <Button variant="outline">Manual Trade</Button>
          <Button variant="outline">View Reports</Button>
        </div>
      </CardContent>
    </Card>
  )
}
'@ | Set-Content -Path ".\src\interfaces\web\components\trading\trading-dashboard.tsx" -Encoding UTF8