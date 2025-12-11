export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
  source: string;
  metadata?: Record<string, any>;
}

export interface TechnicalIndicators {
  symbol: string;
  rsi: number;
  macd: { value: number; signal: number; histogram: number; };
  movingAverages: { sma20: number; sma50: number; sma200: number; };
  bollingerBands: { upper: number; middle: number; lower: number; };
  timestamp: Date;
}

export interface NewsItem {
  id: string;
  symbol: string;
  title: string;
  description?: string;
  source: string;
  url: string;
  publishedAt: Date;
  sentiment?: { score: number; label: "positive" | "negative" | "neutral"; };
  categories?: string[];
}

export interface MarketSentiment {
  symbol: string;
  score: number;
  label: "bullish" | "bearish" | "neutral";
  confidence: number;
  positiveCount: number;
  negativeCount: number;
  totalCount: number;
  timestamp: Date;
}
