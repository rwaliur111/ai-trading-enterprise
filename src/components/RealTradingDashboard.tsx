'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function RealTradingDashboard() {
  const [symbol, setSymbol] = useState('AAPL');
  const [marketData, setMarketData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [account, setAccount] = useState<any>(null);

  const fetchRealTimeData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/market-data/${symbol}`);
      const data = await response.json();
      setMarketData(data);
      
      // Store signal in database
      if (data.analysis) {
        await supabase.from('trading_signals').insert([{
          symbol: data.symbol,
          action: data.analysis.action,
          type: 'MARKET',
          price: data.quote.price,
          quantity: data.analysis.quantity || 100,
          confidence: data.analysis.confidence,
          reasoning: data.analysis.reasoning,
          source: 'AI_ANALYSIS'
        }]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeTrade = async (action: 'BUY' | 'SELL') => {
    if (!marketData) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/trade/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          action,
          quantity: marketData.analysis?.quantity || 100,
          price: marketData.quote.price
        })
      });
      
      const result = await response.json();
      alert(`${action} order placed! Order ID: ${result.orderId}`);
      fetchPortfolio();
    } catch (error) {
      console.error('Trade error:', error);
      alert('Trade failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const response = await fetch('/api/portfolio');
      const data = await response.json();
      setPortfolio(data.positions || []);
      setAccount(data.account || null);
    } catch (error) {
      console.error('Portfolio error:', error);
    }
  };

  useEffect(() => {
    fetchRealTimeData();
    fetchPortfolio();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchRealTimeData, 30000);
    return () => clearInterval(interval);
  }, [symbol]);

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🚀 AI Trading Terminal</h1>
        <p className="text-gray-400 mb-6">Real-time trading with AI-powered signals</p>
        
        {/* Account Summary */}
        {account && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-gray-400">Account Value</p>
              <p className="text-2xl font-bold">${parseFloat(account.portfolio_value).toLocaleString()}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-gray-400">Buying Power</p>
              <p className="text-2xl font-bold">${parseFloat(account.buying_power).toLocaleString()}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-gray-400">Today's P&L</p>
              <p className={`text-2xl font-bold ${parseFloat(account.unrealized_pl) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${parseFloat(account.unrealized_pl).toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-gray-400">Positions</p>
              <p className="text-2xl font-bold">{portfolio.length}</p>
            </div>
          </div>
        )}
        
        {/* Trading Controls */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Enter symbol (AAPL, TSLA, etc)"
              className="bg-gray-700 text-white px-4 py-2 rounded-lg flex-1"
            />
            <button
              onClick={fetchRealTimeData}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={() => executeTrade('BUY')}
              disabled={loading || !marketData}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg text-lg font-bold disabled:opacity-50"
            >
              🟢 BUY NOW
            </button>
            <button
              onClick={() => executeTrade('SELL')}
              disabled={loading || !marketData}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg text-lg font-bold disabled:opacity-50"
            >
              🔴 SELL NOW
            </button>
          </div>
        </div>
        
        {/* Market Data Display */}
        {marketData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real-time Data */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">📈 {marketData.symbol} Live Data</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Current Price</span>
                  <span className="text-3xl font-bold">${marketData.quote?.price?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Change</span>
                  <span className={`text-2xl font-bold ${marketData.quote?.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {marketData.quote?.change > 0 ? '+' : ''}{marketData.quote?.change?.toFixed(2)} ({marketData.quote?.changePercent})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Volume</span>
                  <span className="text-xl font-bold">{marketData.quote?.volume?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Source</span>
                  <span className="text-xl font-bold">{marketData.source}</span>
                </div>
              </div>
            </div>
            
            {/* AI Analysis */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">🤖 AI Trading Signal</h2>
              <div className={`p-4 rounded-lg mb-4 ${
                marketData.analysis?.action === 'BUY' ? 'bg-green-900/30 border-green-500' :
                marketData.analysis?.action === 'SELL' ? 'bg-red-900/30 border-red-500' :
                'bg-yellow-900/30 border-yellow-500'
              } border-2`}>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">
                    {marketData.analysis?.action === 'BUY' ? '🟢 BUY' : 
                     marketData.analysis?.action === 'SELL' ? '🔴 SELL' : '🟡 HOLD'}
                  </div>
                  <div className="text-2xl font-bold">
                    Confidence: {(marketData.analysis?.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Price Target</span>
                  <span className="text-xl font-bold">${marketData.analysis?.priceTarget?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Stop Loss</span>
                  <span className="text-xl font-bold">${marketData.analysis?.stopLoss?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Risk Level</span>
                  <span className={`text-xl font-bold ${
                    marketData.analysis?.riskLevel === 'HIGH' ? 'text-red-400' :
                    marketData.analysis?.riskLevel === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {marketData.analysis?.riskLevel}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-gray-900 rounded-lg">
                <p className="text-gray-400 text-sm">AI Reasoning:</p>
                <p className="text-white">{marketData.analysis?.reasoning}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Portfolio */}
        {portfolio.length > 0 && (
          <div className="mt-6 bg-gray-800 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4">💰 Your Portfolio</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2">Symbol</th>
                    <th className="text-left py-2">Shares</th>
                    <th className="text-left py-2">Avg Price</th>
                    <th className="text-left py-2">Current</th>
                    <th className="text-left py-2">P&L</th>
                    <th className="text-left py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.map((position: any) => (
                    <tr key={position.symbol} className="border-b border-gray-700">
                      <td className="py-3 font-bold">{position.symbol}</td>
                      <td className="py-3">{parseFloat(position.qty).toFixed(2)}</td>
                      <td className="py-3">${parseFloat(position.avg_entry_price).toFixed(2)}</td>
                      <td className="py-3">${parseFloat(position.current_price).toFixed(2)}</td>
                      <td className={`py-3 font-bold ${parseFloat(position.unrealized_pl) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${parseFloat(position.unrealized_pl).toFixed(2)}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => {
                            setSymbol(position.symbol);
                            fetchRealTimeData();
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Analyze
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
