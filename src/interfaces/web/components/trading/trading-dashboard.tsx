'use client'

import { useState, useEffect, useCallback } from 'react'
import Card from '../ui/card'
import Button from '../ui/button'
import { AIAgentOrchestrator } from '@/application/services/ai-agent-orchestrator'
import { MarketDataService } from '@/domains/market-data/services/market-data-service'

interface TradingDashboardProps {
  marketData?: any
  portfolio?: any
  onPlaceOrder?: (symbol: string, quantity: number, side: 'buy' | 'sell') => Promise<void>
}

export default function TradingDashboard({ marketData, portfolio, onPlaceOrder }: TradingDashboardProps) {
  const [activeTab, setActiveTab] = useState('portfolio')
  const [orders, setOrders] = useState<any[]>([])
  const [signals, setSignals] = useState<any[]>([])
  const [marketAnalysis, setMarketAnalysis] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [orderForm, setOrderForm] = useState({
    symbol: 'AAPL',
    quantity: 10,
    side: 'buy' as 'buy' | 'sell',
    type: 'market' as 'market' | 'limit' | 'stop',
    limitPrice: '',
    stopPrice: ''
  })

  const orchestrator = new AIAgentOrchestrator()
  const marketDataService = new MarketDataService()

  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, signalsRes, analysisRes] = await Promise.all([
        fetch('/api/trading/orders'),
        fetch('/api/trading/signals'),
        fetch('/api/market-data/quotes?scan=momentum')
      ])

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json()
        setOrders(ordersData.orders || [])
      }

      if (signalsRes.ok) {
        const signalsData = await signalsRes.json()
        setSignals(signalsData.signals || [])
      }

      if (analysisRes.ok) {
        const analysisData = await analysisRes.json()
        setMarketAnalysis(analysisData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [fetchData])

  const handlePlaceOrder = async () => {
    if (!onPlaceOrder) return
    
    setIsLoading(true)
    try {
      await onPlaceOrder(orderForm.symbol, orderForm.quantity, orderForm.side)
      setOrderForm({
        symbol: 'AAPL',
        quantity: 10,
        side: 'buy',
        type: 'market',
        limitPrice: '',
        stopPrice: ''
      })
      await fetchData() // Refresh data
    } catch (error) {
      console.error('Error placing order:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const executeAITrade = async (signal: any) => {
    if (!onPlaceOrder || !window.confirm(`Execute ${signal.action} ${signal.symbol}?`)) return
    
    setIsLoading(true)
    try {
      await onPlaceOrder(
        signal.symbol,
        signal.position_size || 10,
        signal.action.toLowerCase() as 'buy' | 'sell'
      )
      await fetchData()
    } catch (error) {
      console.error('Error executing AI trade:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateAIReport = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/trading/signals?detailed=true')
      const data = await response.json()
      setSignals(data.signals || [])
      alert(`AI Analysis Complete: ${data.signals?.length || 0} signals generated`)
    } catch (error) {
      console.error('Error generating AI report:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const scanMarketOpportunities = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/market-data/quotes?scan=momentum')
      const data = await response.json()
      setMarketAnalysis(data)
      alert(`Market Scan Complete: ${data.opportunities?.length || 0} opportunities found`)
    } catch (error) {
      console.error('Error scanning market:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trading Dashboard</h1>
          <p className="text-gray-600">Real-time trading and portfolio management</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={generateAIReport}
            disabled={isLoading}
            variant="primary"
          >
            {isLoading ? 'Analyzing...' : 'Generate AI Report'}
          </Button>
          <Button 
            onClick={scanMarketOpportunities}
            disabled={isLoading}
            variant="secondary"
          >
            Scan Market
          </Button>
          <Button 
            onClick={fetchData}
            variant="secondary"
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="text-sm text-blue-600 font-medium">Portfolio Value</div>
          <div className="text-2xl font-bold text-gray-900">
            ${portfolio?.totalValue?.toLocaleString() || '0'}
          </div>
          <div className={`text-sm ${portfolio?.totalUnrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {portfolio?.totalUnrealizedPL >= 0 ? '+' : ''}${portfolio?.totalUnrealizedPL?.toFixed(2) || '0'} ({portfolio?.totalUnrealizedPLPercent?.toFixed(2) || '0'}%)
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100">
          <div className="text-sm text-green-600 font-medium">Buying Power</div>
          <div className="text-2xl font-bold text-gray-900">
            ${portfolio?.account?.buying_power?.toLocaleString() || '0'}
          </div>
          <div className="text-sm text-gray-600">
            Cash: ${portfolio?.account?.cash?.toLocaleString() || '0'}
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
          <div className="text-sm text-purple-600 font-medium">AI Signals</div>
          <div className="text-2xl font-bold text-gray-900">
            {signals.length}
          </div>
          <div className="text-sm text-gray-600">
            {signals.filter((s: any) => s.action === 'BUY').length} Buy, {signals.filter((s: any) => s.action === 'SELL').length} Sell
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100">
          <div className="text-sm text-orange-600 font-medium">Active Orders</div>
          <div className="text-2xl font-bold text-gray-900">
            {orders.filter((o: any) => ['new', 'partially_filled'].includes(o.status)).length}
          </div>
          <div className="text-sm text-gray-600">
            {orders.filter((o: any) => o.status === 'filled').length} filled today
          </div>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['portfolio', 'orders', 'signals', 'market', 'trade'].map((tab) => (
            <button
              key={tab}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            <Card title="Portfolio Holdings">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P/L</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Signal</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {portfolio?.positions?.map((position: any, index: number) => {
                      const signal = signals.find((s: any) => s.symbol === position.symbol)
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{position.symbol}</div>
                            <div className="text-sm text-gray-500">{position.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{position.quantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap">${position.avg_entry_price?.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">${position.current_price?.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">${position.market_value?.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              position.unrealized_pl >= 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {position.unrealized_pl >= 0 ? '+' : ''}${position.unrealized_pl?.toFixed(2)} ({position.unrealized_pl_percent?.toFixed(2)}%)
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {signal && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                signal.action === 'BUY' 
                                  ? 'bg-green-100 text-green-800'
                                  : signal.action === 'SELL'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {signal.action} ({(signal.confidence * 100).toFixed(0)}%)
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => onPlaceOrder?.(position.symbol, Math.floor(position.quantity * 0.1), 'sell')}
                                className="text-sm text-red-600 hover:text-red-900"
                              >
                                Sell 10%
                              </button>
                              {signal?.action === 'BUY' && (
                                <button
                                  onClick={() => onPlaceOrder?.(position.symbol, 10, 'buy')}
                                  className="text-sm text-green-600 hover:text-green-900"
                                >
                                  Add
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Portfolio Allocation */}
            <Card title="Portfolio Allocation">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">By Sector</h4>
                  {portfolio?.allocation?.by_sector && Object.entries(portfolio.allocation.by_sector).map(([sector, value]: [string, any]) => (
                    <div key={sector} className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{sector}</span>
                        <span className="font-medium">${value.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ 
                            width: `${(value / portfolio.totalValue) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Performance</h4>
                  <div className="space-y-4">
                    {portfolio?.performance && Object.entries(portfolio.performance).map(([period, data]: [string, any]) => (
                      <div key={period} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span className="capitalize text-gray-600">{period}</span>
                        <div className="text-right">
                          <div className={`font-medium ${data.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {data.pnl >= 0 ? '+' : ''}${data.pnl?.toFixed(2)}
                          </div>
                          <div className={`text-sm ${data.percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {data.percent >= 0 ? '+' : ''}{data.percent?.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'orders' && (
          <Card title="Order Management">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
                <span className="text-sm text-gray-500">
                  Showing {orders.length} orders
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Side</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {order.symbol}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            order.side === 'buy' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {order.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.filled_price ? `$${order.filled_price.toFixed(2)}` : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            order.status === 'filled' 
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'canceled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {order.filled_price && order.filled_quantity 
                            ? `$${(order.filled_price * order.filled_quantity).toFixed(2)}`
                            : '—'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'signals' && (
          <Card title="AI Trading Signals">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI-Generated Signals</h3>
                  <p className="text-sm text-gray-600">
                    Real-time analysis based on technical indicators, fundamentals, and market sentiment
                  </p>
                </div>
                <Button onClick={generateAIReport} disabled={isLoading}>
                  {isLoading ? 'Generating...' : 'Refresh Signals'}
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Buy Signals */}
                <div>
                  <h4 className="font-medium text-green-700 mb-4 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Buy Recommendations ({signals.filter((s: any) => s.action === 'BUY').length})
                  </h4>
                  <div className="space-y-4">
                    {signals
                      .filter((s: any) => s.action === 'BUY')
                      .sort((a, b) => b.confidence - a.confidence)
                      .slice(0, 5)
                      .map((signal: any, index: number) => (
                        <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-medium text-gray-900">{signal.symbol}</span>
                              <span className="ml-2 text-sm text-gray-500">${signal.price.toFixed(2)}</span>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {(signal.confidence * 100).toFixed(0)}% confidence
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{signal.reason}</p>
                          <div className="flex justify-between items-center text-sm">
                            <div>
                              <div className="text-gray-500">Target: ${signal.target_price?.toFixed(2)}</div>
                              <div className="text-gray-500">Stop: ${signal.stop_loss?.toFixed(2)}</div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => executeAITrade(signal)}
                                disabled={isLoading}
                              >
                                Execute
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setOrderForm({
                                  ...orderForm,
                                  symbol: signal.symbol,
                                  side: 'buy',
                                  quantity: signal.position_size || 10
                                })}
                              >
                                Review
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>

                {/* Sell Signals */}
                <div>
                  <h4 className="font-medium text-red-700 mb-4 flex items-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    Sell Recommendations ({signals.filter((s: any) => s.action === 'SELL').length})
                  </h4>
                  <div className="space-y-4">
                    {signals
                      .filter((s: any) => s.action === 'SELL')
                      .sort((a, b) => b.confidence - a.confidence)
                      .slice(0, 5)
                      .map((signal: any, index: number) => (
                        <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-medium text-gray-900">{signal.symbol}</span>
                              <span className="ml-2 text-sm text-gray-500">${signal.price.toFixed(2)}</span>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {(signal.confidence * 100).toFixed(0)}% confidence
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{signal.reason}</p>
                          <div className="flex justify-between items-center text-sm">
                            <div>
                              <div className="text-gray-500">Target: ${signal.target_price?.toFixed(2)}</div>
                              <div className="text-gray-500">Stop: ${signal.stop_loss?.toFixed(2)}</div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => executeAITrade(signal)}
                                disabled={isLoading}
                              >
                                Execute
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setOrderForm({
                                  ...orderForm,
                                  symbol: signal.symbol,
                                  side: 'sell',
                                  quantity: signal.position_size || 10
                                })}
                              >
                                Review
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>

              {/* Signal Statistics */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Signal Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-white rounded">
                    <div className="text-2xl font-bold text-gray-900">{signals.length}</div>
                    <div className="text-sm text-gray-600">Total Signals</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {signals.filter((s: any) => s.action === 'BUY').length}
                    </div>
                    <div className="text-sm text-gray-600">Buy Signals</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded">
                    <div className="text-2xl font-bold text-red-600">
                      {signals.filter((s: any) => s.action === 'SELL').length}
                    </div>
                    <div className="text-sm text-gray-600">Sell Signals</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded">
                    <div className="text-2xl font-bold text-gray-900">
                      {signals.length > 0 
                        ? (signals.reduce((sum: number, s: any) => sum + s.confidence, 0) / signals.length * 100).toFixed(1)
                        : '0'
                      }%
                    </div>
                    <div className="text-sm text-gray-600">Avg Confidence</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'market' && (
          <Card title="Market Analysis">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Market Opportunities</h3>
                <Button onClick={scanMarketOpportunities} disabled={isLoading}>
                  {isLoading ? 'Scanning...' : 'Scan Market'}
                </Button>
              </div>

              {marketAnalysis?.opportunities && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Cap</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sector</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {marketAnalysis.opportunities.slice(0, 10).map((opportunity: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                            {opportunity.symbol}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">${opportunity.price.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              opportunity.changePercent >= 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {opportunity.changePercent >= 0 ? '+' : ''}{opportunity.changePercent.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {(opportunity.volume / 1000000).toFixed(1)}M
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {opportunity.marketCap 
                              ? `$${(opportunity.marketCap / 1000000000).toFixed(1)}B`
                              : '—'
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {opportunity.sector || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => setOrderForm({
                                ...orderForm,
                                symbol: opportunity.symbol,
                                side: 'buy',
                                quantity: 10
                              })}
                              className="text-sm text-blue-600 hover:text-blue-900"
                            >
                              Quick Buy
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Market Overview */}
              {marketAnalysis?.market_overview && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Market Overview</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-white rounded">
                      <div className="text-2xl font-bold text-gray-900">
                        {marketAnalysis.market_overview.fearGreedIndex}
                      </div>
                      <div className="text-sm text-gray-600">Fear & Greed Index</div>
                    </div>
                    <div className="text-center p-4 bg-white rounded">
                      <div className="text-2xl font-bold text-green-600">
                        {marketAnalysis.market_overview.advancers}
                      </div>
                      <div className="text-sm text-gray-600">Advancers</div>
                    </div>
                    <div className="text-center p-4 bg-white rounded">
                      <div className="text-2xl font-bold text-red-600">
                        {marketAnalysis.market_overview.decliners}
                      </div>
                      <div className="text-sm text-gray-600">Decliners</div>
                    </div>
                    <div className="text-center p-4 bg-white rounded">
                      <div className="text-2xl font-bold text-gray-900">
                        {marketAnalysis.market_overview.marketStatus.isOpen ? 'OPEN' : 'CLOSED'}
                      </div>
                      <div className="text-sm text-gray-600">Market Status</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'trade' && (
          <Card title="Trade Execution">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Order Form */}
              <div className="lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Place Order</h3>
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Symbol
                      </label>
                      <input
                        type="text"
                        value={orderForm.symbol}
                        onChange={(e) => setOrderForm({...orderForm, symbol: e.target.value.toUpperCase()})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., AAPL"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={orderForm.quantity}
                        onChange={(e) => setOrderForm({...orderForm, quantity: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Side
                      </label>
                      <div className="flex space-x-4">
                        <button
                          type="button"
                          onClick={() => setOrderForm({...orderForm, side: 'buy'})}
                          className={`px-4 py-2 rounded-md font-medium ${
                            orderForm.side === 'buy'
                              ? 'bg-green-100 text-green-800 border-2 border-green-500'
                              : 'bg-gray-100 text-gray-800 border border-gray-300'
                          }`}
                        >
                          Buy
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderForm({...orderForm, side: 'sell'})}
                          className={`px-4 py-2 rounded-md font-medium ${
                            orderForm.side === 'sell'
                              ? 'bg-red-100 text-red-800 border-2 border-red-500'
                              : 'bg-gray-100 text-gray-800 border border-gray-300'
                          }`}
                        >
                          Sell
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Order Type
                      </label>
                      <select
                        value={orderForm.type}
                        onChange={(e) => setOrderForm({...orderForm, type: e.target.value as any})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="market">Market</option>
                        <option value="limit">Limit</option>
                        <option value="stop">Stop</option>
                      </select>
                    </div>

                    {orderForm.type === 'limit' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Limit Price
                        </label>
                        <input
                          type="number"
                          value={orderForm.limitPrice}
                          onChange={(e) => setOrderForm({...orderForm, limitPrice: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          step="0.01"
                        />
                      </div>
                    )}

                    {orderForm.type === 'stop' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Stop Price
                        </label>
                        <input
                          type="number"
                          value={orderForm.stopPrice}
                          onChange={(e) => setOrderForm({...orderForm, stopPrice: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          step="0.01"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-8">
                    <Button
                      onClick={handlePlaceOrder}
                      disabled={isLoading || !orderForm.symbol || orderForm.quantity <= 0}
                      className="w-full py-3"
                      variant={orderForm.side === 'buy' ? 'primary' : 'danger'}
                    >
                      {isLoading ? 'Placing Order...' : `${orderForm.side.toUpperCase()} ${orderForm.quantity} ${orderForm.symbol}`}
                    </Button>
                    
                    {orderForm.symbol && orderForm.quantity > 0 && marketData && (
                      <div className="mt-4 p-4 bg-gray-50 rounded text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Estimated Cost:</span>
                          <span className="font-medium">
                            ${(marketData.price * orderForm.quantity).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-gray-600">Commission:</span>
                          <span className="font-medium">${TRADING_CONFIG.COMMISSION_PER_TRADE}</span>
                        </div>
                        <div className="flex justify-between mt-1 border-t pt-1">
                          <span className="text-gray-600">Total:</span>
                          <span className="font-medium">
                            ${(marketData.price * orderForm.quantity + TRADING_CONFIG.COMMISSION_PER_TRADE).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Trade Panel */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Trade</h3>
                <div className="space-y-4">
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Popular Stocks</h4>
                    <div className="space-y-2">
                      {['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA'].map((symbol) => (
                        <div key={symbol} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                          <span className="font-medium">{symbol}</span>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setOrderForm({
                                ...orderForm,
                                symbol,
                                side: 'buy',
                                quantity: 10
                              })}
                              className="text-sm text-green-600 hover:text-green-900"
                            >
                              Buy
                            </button>
                            <button
                              onClick={() => setOrderForm({
                                ...orderForm,
                                symbol,
                                side: 'sell',
                                quantity: 10
                              })}
                              className="text-sm text-red-600 hover:text-red-900"
                            >
                              Sell
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Position Sizing</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Conservative</span>
                          <span className="font-medium">1-10 shares</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Moderate</span>
                          <span className="font-medium">11-50 shares</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '50%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Aggressive</span>
                          <span className="font-medium">51+ shares</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-red-500 h-2 rounded-full" style={{ width: '80%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Risk Calculator</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Max Position:</span>
                        <span className="font-medium">${TRADING_CONFIG.MAX_POSITION_SIZE.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Risk per Trade:</span>
                        <span className="font-medium">{(TRADING_CONFIG.RISK_PER_TRADE * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Max Daily Loss:</span>
                        <span className="font-medium">${TRADING_CONFIG.MAX_DAILY_LOSS}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-600">Available Risk:</span>
                        <span className="font-medium text-green-600">
                          ${((portfolio?.account?.buying_power || 0) * TRADING_CONFIG.RISK_PER_TRADE).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}