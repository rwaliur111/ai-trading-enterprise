'use client';

import React, { useState, useEffect } from 'react';
import { MarketDataService } from '@/domains/market-data/services/market-data-service';
import { PortfolioService } from '@/application/services/portfolio-service';
import { TradingService } from '@/application/services/trading-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SYMBOLS } from '@/config/constants';

export default function TradingDashboard() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(SYMBOLS[0]);
  const [quantity, setQuantity] = useState<string>('1');
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [quotesData, portfolioData, ordersData] = await Promise.all([
        MarketDataService.getQuotes(SYMBOLS),
        new PortfolioService().getPortfolio(),
        new TradingService().getOrders()
      ]);
      
      setQuotes(quotesData);
      setPortfolio(portfolioData);
      setOrders(ordersData.slice(0, 5)); // Show only 5 recent orders
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrade = async () => {
    try {
      const tradingService = new TradingService();
      const order = await tradingService.placeOrder({
        symbol: selectedSymbol,
        quantity: Number(quantity),
        side: orderType,
        type: 'market',
        timeInForce: 'day'
      });
      
      alert(`Order placed successfully! Order ID: ${order.id}`);
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Data Card */}
        <Card>
          <CardHeader>
            <CardTitle>Market Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading quotes...</div>
            ) : (
              <div className="space-y-2">
                {quotes.map((quote) => (
                  <div key={quote.symbol} className="flex justify-between items-center p-2 border-b">
                    <span className="font-medium">{quote.symbol}</span>
                    <span className={quote.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ${quote.last_price?.toFixed(2) || '0.00'}
                      <span className="text-sm ml-2">
                        ({quote.change >= 0 ? '+' : ''}{quote.change?.toFixed(2)}%)
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trading Card */}
        <Card>
          <CardHeader>
            <CardTitle>Execute Trade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Symbol</label>
                <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select symbol" />
                  </SelectTrigger>
                  <SelectContent>
                    {SYMBOLS.map((symbol) => (
                      <SelectItem key={symbol} value={symbol}>
                        {symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Order Type</label>
                <Select value={orderType} onValueChange={(value: 'buy' | 'sell') => setOrderType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select order type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Quantity</label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                />
              </div>
              
              <Button 
                onClick={handleTrade} 
                className="w-full"
                disabled={loading || !quantity || Number(quantity) <= 0}
              >
                {orderType === 'buy' ? 'Buy' : 'Sell'} {selectedSymbol}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading portfolio...</div>
            ) : portfolio ? (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Value:</span>
                  <span className="font-bold">
                    ${portfolio.total_market_value?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Unrealized P/L:</span>
                  <span className={`font-bold ${
                    (portfolio.total_unrealized_pl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${portfolio.total_unrealized_pl?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Buying Power:</span>
                  <span className="font-bold">
                    ${portfolio.buying_power?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Positions ({portfolio.positions?.length || 0})</h4>
                  {portfolio.positions && portfolio.positions.length > 0 ? (
                    <div className="space-y-2">
                      {portfolio.positions.slice(0, 3).map((pos: any) => (
                        <div key={pos.symbol} className="flex justify-between text-sm">
                          <span>{pos.symbol}</span>
                          <span>{pos.qty} shares</span>
                        </div>
                      ))}
                      {portfolio.positions.length > 3 && (
                        <div className="text-sm text-gray-500">
                          +{portfolio.positions.length - 3} more positions
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No positions</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">No portfolio data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading orders...</div>
          ) : orders && orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Order ID</th>
                    <th className="text-left py-2">Symbol</th>
                    <th className="text-left py-2">Side</th>
                    <th className="text-left py-2">Quantity</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b">
                      <td className="py-2">{order.id?.substring(0, 8)}...</td>
                      <td className="py-2">{order.symbol}</td>
                      <td className={`py-2 font-medium ${
                        order.side === 'buy' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {order.side?.toUpperCase()}
                      </td>
                      <td className="py-2">{order.qty || order.quantity}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          order.status === 'filled' ? 'bg-green-100 text-green-800' :
                          order.status === 'partially_filled' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'canceled' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-2 text-sm text-gray-500">
                        {new Date(order.submitted_at || order.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4">No recent orders</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}