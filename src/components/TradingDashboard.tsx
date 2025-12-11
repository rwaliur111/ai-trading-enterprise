'use client';

import { useState, useEffect } from 'react';

export default function TradingDashboard() {
  const [symbol, setSymbol] = useState('AAPL');
  const [marketData, setMarketData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchRealTimeData = async (sym: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/market-data/${sym}`);
      const data = await response.json();
      setMarketData(data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeStock = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analyze/${symbol}`, {
        method: 'POST'
      });
      const result = await response.json();
      console.log('Analysis result:', result);
      alert(`Analysis complete! Recommendation: ${result.action} with ${(result.confidence * 100).toFixed(1)}% confidence`);
    } catch (error) {
      console.error('Error analyzing:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealTimeData(symbol);
    // Refresh every 30 seconds
    const interval = setInterval(() => fetchRealTimeData(symbol), 30000);
    return () => clearInterval(interval);
  }, [symbol]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">AI Trading Dashboard</h1>
      
      <div className="mb-6">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="Enter symbol (e.g., AAPL)"
          className="border p-2 mr-2"
        />
        <button
          onClick={() => fetchRealTimeData(symbol)}
          disabled={loading}
          className="bg-blue-500 text-white p-2 rounded disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Get Real-Time Data'}
        </button>
        <button
          onClick={analyzeStock}
          disabled={loading}
          className="bg-green-500 text-white p-2 rounded ml-2 disabled:opacity-50"
        >
          AI Analyze
        </button>
      </div>

      {marketData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-3">Real-Time Data: {marketData.symbol}</h2>
            <p>Price: <span className="font-bold">${marketData.quote?.price?.toFixed(2)}</span></p>
            <p>Change: <span className={marketData.quote?.change > 0 ? 'text-green-600' : 'text-red-600'}>
              {marketData.quote?.change?.toFixed(2)} ({marketData.quote?.changePercent})
            </span></p>
            <p>Volume: {marketData.quote?.volume?.toLocaleString()}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-3">AI Analysis</h2>
            <p>Recommendation: 
              <span className={`font-bold ml-2 ${
                marketData.analysis?.action === 'BUY' ? 'text-green-600' :
                marketData.analysis?.action === 'SELL' ? 'text-red-600' : 'text-yellow-600'
              }`}>
                {marketData.analysis?.action}
              </span>
            </p>
            <p>Confidence: {(marketData.analysis?.confidence * 100).toFixed(1)}%</p>
            <p>Price Target: ${marketData.analysis?.priceTarget?.toFixed(2)}</p>
            <p className="mt-2 text-sm">{marketData.analysis?.reasoning}</p>
          </div>
        </div>
      )}
    </div>
  );
}