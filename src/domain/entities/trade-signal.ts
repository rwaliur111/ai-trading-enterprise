export interface TradeSignal {
  id?: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  type: 'MARKET' | 'LIMIT' | 'STOP';
  price: number;
  quantity: number;
  confidence: number;
  reasoning: string;
  source: string;
  timestamp?: Date;
}
