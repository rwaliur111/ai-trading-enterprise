// src/domains/trading/entities/trade.ts
export interface TradeSignal {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  type: 'MARKET' | 'LIMIT' | 'STOP';
  price: number;
  quantity: number;
  confidence: number;
  timestamp: Date;
  source: string;
  reasoning: string;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  stopPrice?: number;
  limitPrice?: number;
}

export interface Position {
  id: string;
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPL: number;
  realizedPL: number;
  openedAt: Date;
  lastUpdated: Date;
}

export interface Order {
  id: string;
  symbol: string;
  type: 'MARKET' | 'LIMIT' | 'STOP';
  side: 'BUY' | 'SELL';
  quantity: number;
  price?: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  filledQuantity: number;
  filledPrice?: number;
  createdAt: Date;
  updatedAt: Date;
}
