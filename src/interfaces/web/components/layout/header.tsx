'use client';

import React from 'react';

export default function Header() {
  const currentTime = new Date().toLocaleTimeString();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex justify-between items-center px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trading Dashboard</h1>
          <p className="text-sm text-gray-500">Real-time AI-powered trading</p>
        </div>
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{currentTime}</p>
            <p className="text-xs text-gray-500">Market Hours: 9:30 AM - 4:00 PM ET</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-600">Live</span>
          </div>
        </div>
      </div>
    </header>
  );
}
