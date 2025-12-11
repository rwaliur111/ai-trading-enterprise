import React from 'react';
import MainLayout from '../components/layout/main-layout';

export default function TradingPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trading Interface</h1>
          <p className="text-gray-600">Manual trading and signal management</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Trade</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Symbol</label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., AAPL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Action</label>
                <select className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  <option value="BUY">Buy</option>
                  <option value="SELL">Sell</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                <input
                  type="number"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="100"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Execute Trade
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">AI Signals</h2>
            <div className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-green-800">AAPL</span>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">BUY</span>
                </div>
                <p className="text-sm text-green-600 mt-1">Strong bullish momentum detected</p>
                <p className="text-xs text-green-500 mt-2">Confidence: 85%</p>
              </div>
              
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-red-800">TSLA</span>
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">SELL</span>
                </div>
                <p className="text-sm text-red-600 mt-1">Overbought conditions</p>
                <p className="text-xs text-red-500 mt-2">Confidence: 72%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
