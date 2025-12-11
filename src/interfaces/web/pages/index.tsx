import React from 'react';
import TradingDashboard from '../components/trading/trading-dashboard';
import MainLayout from '../components/layout/main-layout';

export default function HomePage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trading Dashboard</h1>
          <p className="text-gray-600">Monitor your AI trading performance in real-time</p>
        </div>
        <TradingDashboard />
      </div>
    </MainLayout>
  );
}
