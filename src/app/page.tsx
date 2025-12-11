'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';

export default function Home() {
  const [symbol, setSymbol] = useState('AAPL');
  const [marketData, setMarketData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRealTimeData = async (sym: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/market-data/${sym}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      setMarketData(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const analyzeStock = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/market-data/${symbol}`);
      const result = await response.json();
      
      if (result.analysis) {
        alert(`AI Analysis Result:
        Recommendation: ${result.analysis.action}
        Confidence: ${(result.analysis.confidence * 100).toFixed(1)}%
        Price Target: $${result.analysis.priceTarget?.toFixed(2)}
        Reasoning: ${result.analysis.reasoning}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealTimeData(symbol);
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-2">AI Trading Enterprise</h1>
        <p className="text-center text-gray-600 mb-8">Real-time market analysis powered by AI</p>
        
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6">
          <div className="mb-6">
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="Enter stock symbol (e.g., AAPL)"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => fetchRealTimeData(symbol)}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Loading...' : 'Get Data'}
              </button>
              <button
                onClick={analyzeStock}
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                AI Analyze
              </button>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}
          </div>
          
          {marketData && (
            <div className="space-y-6">
              {/* Real-time Data Card */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4">📈 {marketData.symbol} Real-Time Data</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow">
                    <p className="text-gray-500 text-sm">Current Price</p>
                    <p className="text-2xl font-bold">${marketData.quote?.price?.toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <p className="text-gray-500 text-sm">Change</p>
                    <p className={`text-xl font-bold ${marketData.quote?.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {marketData.quote?.change > 0 ? '+' : ''}{marketData.quote?.change?.toFixed(2)} ({marketData.quote?.changePercent})
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <p className="text-gray-500 text-sm">Volume</p>
                    <p className="text-xl font-bold">{marketData.quote?.volume?.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <p className="text-gray-500 text-sm">Last Updated</p>
                    <p className="text-xl font-bold">{new Date(marketData.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>
              
              {/* AI Analysis Card */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4">🤖 AI Trading Analysis</h2>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-gray-500">Recommendation:</span>
                      <span className={`ml-2 text-2xl font-bold ${
                        marketData.analysis?.action === 'BUY' ? 'text-green-600' :
                        marketData.analysis?.action === 'SELL' ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {marketData.analysis?.action}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500">Confidence:</span>
                      <span className="ml-2 text-2xl font-bold">
                        {(marketData.analysis?.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-gray-500 mb-1">Price Target:</p>
                    <p className="text-xl font-bold">${marketData.analysis?.priceTarget?.toFixed(2)}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-500 mb-1">AI Reasoning:</p>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                      {marketData.analysis?.reasoning}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Data provided by Alpha Vantage • Analysis powered by AI • Updates every 30 seconds</p>
        </div>
      </div>
    </main>
  );
}