// src/domains/market-data/entities/market-data.ts
export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
  high: number;
  low: number;
  open: number;
  previousClose: number;
}

export interface NewsSentiment {
  id: string;
  symbol: string;
  title: string;
  content: string;
  source: string;
  publishedAt: Date;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  confidence: number;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface TechnicalIndicators {
  symbol: string;
  timestamp: Date;
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  sma: {
    short: number;
    medium: number;
    long: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  volume: number;
}
